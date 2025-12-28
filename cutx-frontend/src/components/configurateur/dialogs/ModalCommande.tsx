'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, PenTool, Shield, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import SignaturePad from '@/components/signature/SignaturePad';

interface ModalCommandeProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { dateFinSouhaitee: string; commentaireDate: string; signatureData: string }) => Promise<boolean>;
  clientName: string;
  totalTTC: number;
  totalHT: number;
}

export default function ModalCommande({
  open,
  onClose,
  onConfirm,
  clientName,
  totalTTC,
  totalHT,
}: ModalCommandeProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [commentaireDate, setCommentaireDate] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [luApprouve, setLuApprouve] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDate(null);
      setCommentaireDate('');
      setSignatureData(null);
      setCgvAccepted(false);
      setLuApprouve(false);
      setCurrentMonth(new Date());
    }
  }, [open]);

  const canSubmit = selectedDate && signatureData && cgvAccepted && luApprouve;

  const handleSubmit = async () => {
    if (!canSubmit || !signatureData) return;

    setIsSubmitting(true);
    try {
      const success = await onConfirm({
        dateFinSouhaitee: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
        commentaireDate,
        signatureData,
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon">
              <PenTool size={20} />
            </div>
            <div>
              <h2>Finaliser votre commande</h2>
              <p>Choisissez votre date et signez pour valider</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Left side - Calendar */}
          <div className="section-calendar">
            <div className="section-title">
              <Calendar size={18} />
              <span>Date de fin souhaitée</span>
            </div>

            <div className="calendar">
              <div className="calendar-header">
                <button className="nav-btn" onClick={prevMonth}>
                  <ChevronLeft size={18} />
                </button>
                <span className="month-year">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button className="nav-btn" onClick={nextMonth}>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="calendar-days-header">
                {dayNames.map(day => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {getDaysInMonth(currentMonth).map((date, i) => (
                  <button
                    key={i}
                    className={`day-btn ${!date ? 'empty' : ''} ${date && isPast(date) ? 'past' : ''} ${date && isToday(date) ? 'today' : ''} ${date && isSelected(date) ? 'selected' : ''}`}
                    onClick={() => date && !isPast(date) && setSelectedDate(date)}
                    disabled={!date || isPast(date)}
                  >
                    {date?.getDate()}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="selected-date-display">
                <span>Date sélectionnée :</span>
                <strong>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </div>
            )}

            <div className="comment-field">
              <label>Commentaire (optionnel)</label>
              <input
                type="text"
                value={commentaireDate}
                onChange={(e) => setCommentaireDate(e.target.value)}
                placeholder="Ex: Chantier prévu semaine 12..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="divider" />

          {/* Right side - Signature */}
          <div className="section-signature">
            <div className="section-title">
              <PenTool size={18} />
              <span>Signature électronique</span>
            </div>

            {/* Montant */}
            <div className="amount-box">
              <div className="amount-row">
                <span>Total HT</span>
                <span className="amount-ht">{totalHT.toFixed(2)} €</span>
              </div>
              <div className="amount-row main">
                <span>Total TTC</span>
                <span className="amount-ttc">{totalTTC.toFixed(2)} €</span>
              </div>
            </div>

            {/* Signature */}
            <div className="signature-area">
              <label>Votre signature</label>
              <SignaturePad
                clientName={clientName}
                onSignatureChange={setSignatureData}
                disabled={isSubmitting}
              />
            </div>

            {/* Checkboxes */}
            <div className="checkboxes">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={cgvAccepted}
                  onChange={(e) => setCgvAccepted(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>
                  J'ai lu et j'accepte les{' '}
                  <a href="/cgv" target="_blank">Conditions Générales de Vente</a>
                </span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={luApprouve}
                  onChange={(e) => setLuApprouve(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>
                  <strong>Lu et approuvé - Bon pour accord</strong><br />
                  Je reconnais avoir pris connaissance des prestations et accepte le devis.
                </span>
              </label>
            </div>

            {/* Legal info */}
            <div className="legal-info">
              <Shield size={14} />
              <span>Cette signature électronique a valeur légale (règlement eIDAS UE 910/2014). Date, heure et adresse IP seront enregistrées.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </button>
          <button
            className={`btn-submit ${canSubmit ? 'active' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Accepter et signer
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-container {
          background: #1a1918;
          border-radius: 16px;
          border: 1px solid #2a2928;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #2a2928;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8B9D51 0%, #6B7D31 100%);
          border-radius: 10px;
          color: white;
        }

        .header-content h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #F5F4F1;
        }

        .header-content p {
          margin: 0;
          font-size: 0.8125rem;
          color: #A5A49F;
        }

        .btn-close {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #252423;
          border: 1px solid #3a3938;
          border-radius: 8px;
          color: #A5A49F;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: #2a2928;
          color: #F5F4F1;
        }

        .modal-content {
          display: flex;
          padding: 1.5rem;
          gap: 1.5rem;
          flex: 1;
          min-height: 0;
        }

        .section-calendar,
        .section-signature {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .divider {
          width: 1px;
          background: #2a2928;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #8B9D51;
        }

        /* Calendar */
        .calendar {
          background: #121110;
          border: 1px solid #2a2928;
          border-radius: 12px;
          padding: 1rem;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .month-year {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #F5F4F1;
        }

        .nav-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1918;
          border: 1px solid #3a3938;
          border-radius: 6px;
          color: #A5A49F;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: #252423;
          color: #F5F4F1;
        }

        .calendar-days-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          margin-bottom: 0.5rem;
        }

        .calendar-days-header span {
          text-align: center;
          font-size: 0.6875rem;
          font-weight: 600;
          color: #6B6A66;
          text-transform: uppercase;
          padding: 0.25rem 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .day-btn {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 500;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #F5F4F1;
          cursor: pointer;
          transition: all 0.15s;
        }

        .day-btn:hover:not(.empty):not(.past):not(.selected) {
          background: #252423;
        }

        .day-btn.empty {
          cursor: default;
        }

        .day-btn.past {
          color: #4a4948;
          cursor: not-allowed;
        }

        .day-btn.today {
          background: #252423;
          border: 1px solid #8B9D51;
        }

        .day-btn.selected {
          background: linear-gradient(135deg, #8B9D51 0%, #6B7D31 100%);
          color: white;
          font-weight: 600;
        }

        .selected-date-display {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: rgba(139, 157, 81, 0.1);
          border: 1px solid rgba(139, 157, 81, 0.2);
          border-radius: 8px;
          font-size: 0.8125rem;
        }

        .selected-date-display span {
          color: #A5A49F;
        }

        .selected-date-display strong {
          color: #8B9D51;
          text-transform: capitalize;
        }

        .comment-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .comment-field label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #A5A49F;
        }

        .comment-field input {
          padding: 0.625rem 0.75rem;
          background: #121110;
          border: 1px solid #2a2928;
          border-radius: 8px;
          font-size: 0.8125rem;
          color: #F5F4F1;
        }

        .comment-field input:focus {
          outline: none;
          border-color: #8B9D51;
        }

        .comment-field input::placeholder {
          color: #6B6A66;
        }

        /* Signature section */
        .amount-box {
          background: #121110;
          border: 1px solid #2a2928;
          border-radius: 10px;
          padding: 0.875rem;
        }

        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8125rem;
          color: #A5A49F;
        }

        .amount-row.main {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #2a2928;
        }

        .amount-ht {
          font-weight: 500;
          color: #C9B896;
        }

        .amount-ttc {
          font-size: 1.25rem;
          font-weight: 700;
          color: #8B9D51;
        }

        .signature-area {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .signature-area label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #A5A49F;
        }

        .checkboxes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .checkbox-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          cursor: pointer;
        }

        .checkbox-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          accent-color: #8B9D51;
          cursor: pointer;
        }

        .checkbox-item span {
          font-size: 0.8125rem;
          color: #A5A49F;
          line-height: 1.4;
        }

        .checkbox-item span strong {
          color: #F5F4F1;
        }

        .checkbox-item a {
          color: #8B9D51;
          text-decoration: none;
        }

        .checkbox-item a:hover {
          text-decoration: underline;
        }

        .legal-info {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(139, 157, 81, 0.08);
          border: 1px solid rgba(139, 157, 81, 0.15);
          border-radius: 8px;
        }

        .legal-info svg {
          color: #8B9D51;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .legal-info span {
          font-size: 0.6875rem;
          color: #7A8B9A;
          line-height: 1.4;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #2a2928;
        }

        .btn-cancel {
          padding: 0.625rem 1.25rem;
          background: #252423;
          border: 1px solid #3a3938;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #A5A49F;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #2a2928;
          color: #F5F4F1;
        }

        .btn-submit {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.5rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-submit.active {
          background: linear-gradient(135deg, #8B9D51 0%, #6B7D31 100%);
          border: none;
          color: white;
        }

        .btn-submit.active:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 157, 81, 0.3);
        }

        .btn-submit.disabled {
          background: #252423;
          border: 1px solid #3a3938;
          color: #6B6A66;
          cursor: not-allowed;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .modal-content {
            flex-direction: column;
          }

          .divider {
            width: 100%;
            height: 1px;
          }
        }
      `}</style>
    </div>
  );
}
