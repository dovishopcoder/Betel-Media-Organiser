const { extractPresentationSlides } = require("./presentation-slides");

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

function createSlidesForItem(item) {
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
      return db.prepare("SELECT * FROM programs ORDER BY service_date DESC, id DESC").all();
    },
    getActiveWithItems() {
      const program = db.prepare("SELECT * FROM programs WHERE status = 'active' ORDER BY id DESC LIMIT 1").get();
      if (!program) return null;
      return {
        ...program,
        items: programs.items(program.id)
      };
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
        INSERT INTO program_items (program_id, item_type, title, song_id, file_path, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        programId,
        input.type,
        input.title,
        input.songId || null,
        input.filePath || null,
        input.notes || "",
        maxOrder + 1
      );
      return programs.getItem(result.lastInsertRowid);
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
