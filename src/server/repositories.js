const { extractPresentationSlides } = require("./presentation-slides");
const { getServiceProgramTemplate } = require("./service-templates");

function isVideoPath(filePath) {
  return /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(filePath || "");
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapSong(row) {
  if (!row) return null;
  return {
    ...row,
    sections: parseJson(row.sections_json, {}),
    displayOrder: parseJson(row.display_order_json, []),
    sections_json: undefined,
    display_order_json: undefined
  };
}

function mapProgramItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    type: row.item_type,
    title: row.title,
    songId: row.song_id,
    filePath: row.file_path,
    audioFilePath: row.audio_file_path,
    notes: row.notes,
    sortOrder: row.sort_order,
    song: row.song_title
      ? {
          id: row.song_id,
          title: row.song_title,
          author: row.author,
          sections: parseJson(row.sections_json, {}),
          displayOrder: parseJson(row.display_order_json, [])
        }
      : null
  };
}

function mapProgram(row) {
  if (!row) return null;
  return {
    ...row,
    serviceType: row.service_type || "custom"
  };
}

function createSlidesForItem(item) {
  if (item.type === "song" && item.filePath && isVideoPath(item.filePath)) {
    return [
      {
        id: `${item.id}-karaoke-video`,
        type: "video",
        label: "karaoke",
        title: item.title,
        body: item.notes || item.title,
        filePath: item.filePath,
        notes: item.notes || "",
        sortOrder: 0
      }
    ];
  }

  if (item.type === "song" && item.filePath) {
    const presentationSlides = extractPresentationSlides(item);
    if (presentationSlides.length > 0) {
      return presentationSlides;
    }
  }

  if (item.type === "song" && item.song) {
    return item.song.displayOrder.map((sectionKey, index) => ({
      id: `${item.id}-${sectionKey}-${index}`,
      type: "lyric",
      label: sectionKey,
      title: item.song.title,
      body: item.song.sections[sectionKey] || "",
      notes: item.notes || "",
      sortOrder: index
    }));
  }

  if (item.type === "presentation") {
    const presentationSlides = extractPresentationSlides(item);
    if (presentationSlides.length > 0) {
      return presentationSlides;
    }
  }

  return [
    {
      id: `${item.id}-single`,
      type: item.type,
      label: item.type,
      title: item.title,
      body: item.notes || item.title,
      filePath: item.filePath || null,
      notes: item.notes || "",
      sortOrder: 0
    }
  ];
}

function createRepositories(db) {
  db.prepare("DELETE FROM programs WHERE status != 'active'").run();

  const songs = {
    list() {
      return db.prepare("SELECT * FROM songs ORDER BY title COLLATE NOCASE").all().map(mapSong);
    },
    get(id) {
      return mapSong(db.prepare("SELECT * FROM songs WHERE id = ?").get(id));
    },
    create(input) {
      const sections = input.sections || {
        v1: input.lyrics || ""
      };
      const displayOrder = input.displayOrder || Object.keys(sections);
      const result = db.prepare(`
        INSERT INTO songs (title, author, sections_json, display_order_json)
        VALUES (?, ?, ?, ?)
      `).run(
        input.title,
        input.author || "",
        JSON.stringify(sections),
        JSON.stringify(displayOrder)
      );
      return songs.get(result.lastInsertRowid);
    }
  };

  const programs = {
    list() {
      return db.prepare("SELECT * FROM programs WHERE status = 'active' ORDER BY id DESC LIMIT 1").all().map(mapProgram);
    },
    getActiveWithItems() {
      const program = db.prepare("SELECT * FROM programs WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
      if (!program) return null;
      return {
        ...mapProgram(program),
        items: programs.items(program.id)
      };
    },
    get(id) {
      return mapProgram(db.prepare("SELECT * FROM programs WHERE id = ?").get(id));
    },
    create(input) {
      db.prepare("DELETE FROM programs").run();
      const result = db.prepare(`
        INSERT INTO programs (title, service_date, service_type, status)
        VALUES (?, ?, ?, 'active')
      `).run(
        input.title,
        input.serviceDate || new Date().toISOString().slice(0, 10),
        input.serviceType || "custom"
      );
      const programId = result.lastInsertRowid;
      const templateItems = Array.isArray(input.items)
        ? input.items
        : getServiceProgramTemplate(input.serviceType || "custom");
      templateItems.forEach((item) => programs.addItem(programId, item));
      return programs.get(programId);
    },
    activate(id) {
      const program = programs.get(id);
      if (!program) return null;

      db.prepare("UPDATE programs SET status = 'inactive' WHERE status = 'active'").run();
      db.prepare("UPDATE programs SET status = 'active' WHERE id = ?").run(id);
      return programs.getActiveWithItems();
    },
    items(programId) {
      return db.prepare(`
        SELECT pi.*, s.title as song_title, s.author, s.sections_json, s.display_order_json
        FROM program_items pi
        LEFT JOIN songs s ON s.id = pi.song_id
        WHERE pi.program_id = ?
        ORDER BY pi.sort_order ASC, pi.id ASC
      `).all(programId).map(mapProgramItem);
    },
    getItem(itemId) {
      const row = db.prepare(`
        SELECT pi.*, s.title as song_title, s.author, s.sections_json, s.display_order_json
        FROM program_items pi
        LEFT JOIN songs s ON s.id = pi.song_id
        WHERE pi.id = ?
      `).get(itemId);
      return mapProgramItem(row);
    },
    addItem(programId, input) {
      const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM program_items WHERE program_id = ?").get(programId).maxOrder;
      const result = db.prepare(`
        INSERT INTO program_items (program_id, item_type, title, song_id, file_path, audio_file_path, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        programId,
        input.type,
        input.title,
        input.songId || null,
        input.filePath || null,
        input.audioFilePath || null,
        input.notes || "",
        maxOrder + 1
      );
      return programs.getItem(result.lastInsertRowid);
    },
    updateItem(itemId, input) {
      const existing = programs.getItem(itemId);
      if (!existing) return null;

      db.prepare(`
        UPDATE program_items
        SET title = ?,
            song_id = ?,
            notes = ?
        WHERE id = ?
      `).run(
        input.title ?? existing.title,
        input.songId === undefined ? existing.songId || null : input.songId || null,
        input.notes ?? existing.notes ?? "",
        itemId
      );
      return programs.getItem(itemId);
    },
    reorderItems(programId, itemIds) {
      const ids = Array.isArray(itemIds) ? itemIds.map(Number).filter(Boolean) : [];
      if (ids.length === 0) return programs.getActiveWithItems();

      const existingIds = new Set(db.prepare("SELECT id FROM program_items WHERE program_id = ?").all(programId).map((row) => row.id));
      const updateOrder = db.prepare("UPDATE program_items SET sort_order = ? WHERE id = ? AND program_id = ?");
      const tx = db.transaction(() => {
        ids.forEach((itemId, index) => {
          if (existingIds.has(itemId)) {
            updateOrder.run(index + 1, itemId, programId);
          }
        });
      });

      tx();
      return programs.getActiveWithItems();
    },
    attachFile(itemId, input) {
      db.prepare(`
        UPDATE program_items
        SET file_path = ?
        WHERE id = ?
      `).run(input.filePath || null, itemId);
      return programs.getItem(itemId);
    },
    attachAudio(itemId, input) {
      db.prepare(`
        UPDATE program_items
        SET audio_file_path = ?
        WHERE id = ?
      `).run(input.filePath || null, itemId);
      return programs.getItem(itemId);
    }
  };

  const slides = {
    forProgramItem(item) {
      return createSlidesForItem(item);
    }
  };

  const screens = {
    list() {
      return db.prepare("SELECT * FROM screens ORDER BY id ASC").all();
    }
  };

  return { songs, programs, slides, screens };
}

module.exports = {
  createRepositories,
  createSlidesForItem
};
