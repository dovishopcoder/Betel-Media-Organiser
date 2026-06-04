"use client";

import { useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import { blockTemplates, itemLabels, serviceTemplates } from "@/shared/catalog";
import type { ServiceTemplateItem } from "@/shared/types";

export default function ServicesSettingsPage() {
  const { program, serviceProgramTemplates, loading, refresh, api } = useLiveMedia();
  const [selectedServiceType, setSelectedServiceType] = useState(program?.serviceType || "serviciul_divin");
  const [serviceStatus, setServiceStatus] = useState("");
  const [selectedBlockType, setSelectedBlockType] = useState(blockTemplates[0].type);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const selectedService = serviceTemplates.find((service) => service.type === selectedServiceType) || serviceTemplates[2];
  const templateItems = serviceProgramTemplates[selectedService.type] || [];

  async function saveTemplate(items: ServiceTemplateItem[], successMessage: string) {
    setServiceStatus("Se salveaza template-ul...");
    const response = await api.updateServiceTemplate(selectedService.type, items);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut salva template-ul." }));
      setServiceStatus(error.error);
      return;
    }

    await refresh();
    setServiceStatus(successMessage);
  }

  async function handleAddBlock() {
    const block = blockTemplates.find((item) => item.type === selectedBlockType) || blockTemplates[0];
    await saveTemplate([...templateItems, { type: block.type, title: block.title, notes: block.notes }], `${block.title} a fost adaugat in template.`);
  }

  async function handleRemoveBlock(indexToRemove: number) {
    await saveTemplate(templateItems.filter((_item, index) => index !== indexToRemove), "Blocul a fost scos din template.");
  }

  async function handleTemplateDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDropIndex(null);
      return;
    }

    const nextItems = [...templateItems];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(targetIndex, 0, draggedItem);
    setDraggedIndex(null);
    setDropIndex(null);
    await saveTemplate(nextItems, "Ordinea template-ului a fost salvata.");
  }

  async function handleCreateService() {
    setServiceStatus(`Se creeaza programul curent pentru ${selectedService.title}...`);
    const today = new Date().toISOString().slice(0, 10);
    const response = await api.createProgram({
      title: `${selectedService.title} - ${today}`,
      serviceDate: today,
      serviceType: selectedService.type
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut crea serviciul." }));
      setServiceStatus(error.error);
      return;
    }

    await refresh();
    setServiceStatus(`${selectedService.title} este acum programul curent.`);
  }

  if (loading) {
    return <div className="settings-card muted">Se incarca serviciile...</div>;
  }

  return (
    <section className="settings-section settings-service-page">
      <div className="settings-section-header settings-hero">
        <div>
          <h2 className="title">Servicii si template-uri</h2>
          <p className="muted">Alege tipul serviciului. Template-ul selectat va crea programul curent.</p>
        </div>
        <button className="primary-btn" onClick={handleCreateService}>Creeaza program curent</button>
      </div>

      <div className="settings-two-column">
        <div className="settings-card">
          <div>
            <div className="item-type">Tip serviciu</div>
            <h3 className="settings-card-title">Template disponibil</h3>
          </div>
          <div className="service-type-list large">
            {serviceTemplates.map((service) => (
              <button
                className={selectedServiceType === service.type ? "active" : ""}
                key={service.type}
                onClick={() => setSelectedServiceType(service.type)}
              >
                <span>{service.title}</span>
                <small>template</small>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div>
            <div className="item-type">Template</div>
            <h3 className="settings-card-title">{selectedService.title}</h3>
          </div>
          <div className="template-toolbar">
            <select value={selectedBlockType} onChange={(event) => setSelectedBlockType(event.target.value)}>
              {blockTemplates.map((block) => (
                <option key={block.type} value={block.type}>{itemLabels[block.type] || block.title}</option>
              ))}
            </select>
            <button className="primary-btn" onClick={handleAddBlock}>Adauga bloc</button>
          </div>
          <div className="template-preview-list">
            {templateItems.length ? (
              templateItems.map((item, index) => (
                <div
                  className={`${draggedIndex === index ? "dragging" : ""} ${dropIndex === index ? "drop-target" : ""}`}
                  draggable
                  key={`${item.title}-${item.type}-${index}`}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDropIndex(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== index) setDropIndex(index);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                    setDraggedIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleTemplateDrop(index);
                  }}
                >
                  <span>{index + 1}</span>
                  <strong>{item.title}</strong>
                  <small>{itemLabels[item.type] || item.type}</small>
                  <button aria-label={`Scoate ${item.title}`} className="icon-danger-btn" onClick={() => handleRemoveBlock(index)} type="button">X</button>
                </div>
              ))
            ) : (
              <div className="empty-state">Serviciul custom porneste fara puncte implicite.</div>
            )}
          </div>
          <div className="muted">{serviceStatus || `${program?.title || "Fara serviciu activ"} este serviciul activ.`}</div>
        </div>
      </div>
    </section>
  );
}
