import React from 'react';

export const ProblemSection: React.FC = () => (
  <section className="section" id="product">
    <div className="wrap">
      <div className="section-head reveal">
        <div className="eyebrow mono">Why contractors switch</div>
        <h2>The gap isn't effort. It's visibility.</h2>
      </div>
      <div className="cards3">
        <div className="field-card reveal">
          <div className="pin"></div>
          <h3>Budget drift nobody sees coming</h3>
          <p>Spend gets tracked in three different spreadsheets that only get reconciled at month-end, by which point the overrun is already locked in.</p>
        </div>
        <div className="field-card reveal">
          <div className="pin"></div>
          <h3>Inspections missed by a day</h3>
          <p>A permit renewal or safety walkthrough slips through a WhatsApp thread, and the site sits idle waiting on paperwork.</p>
        </div>
        <div className="field-card reveal">
          <div className="pin"></div>
          <h3>No single view across sites</h3>
          <p>Every site manager knows their own project cold. Nobody above them sees all five at once, until something goes wrong.</p>
        </div>
      </div>
    </div>
  </section>
);
