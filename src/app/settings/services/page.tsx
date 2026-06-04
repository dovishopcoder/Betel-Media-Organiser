"use client";

import { useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import { serviceTemplateBlocks, serviceTemplates } from "@/shared/catalog";

export default function ServicesSettingsPage() {
  const { program, loading, refresh, api } = useLiveMedia();
  const [selectedServiceType, setSelectedServiceType] = useState(program?.serviceType || "serviciul_divin");
  const [serviceStatus, setServiceStatus] = useState("");

  const selectedService = serviceTemplates.find((service) => service.type === selectedServiceType) || serviceTemplates[2];

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
          <div className="template-preview-list">
            {(serviceTemplateBlocks[selectedService.type] || []).length ? (
              serviceTemplateBlocks[selectedService.type].map((title, index) => (
                <div key={`${title}-${index}`}>
                  <span>{index + 1}</span>
                  <strong>{title}</strong>
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
