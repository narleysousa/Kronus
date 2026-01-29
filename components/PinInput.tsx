import React, { useRef, useCallback, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const LENGTH = 4;

interface PinInputProps {
  value: string;
  onChange: (val: string) => void;
  'aria-label'?: string;
}

export const PinInput: React.FC<PinInputProps> = ({ value, onChange, 'aria-label': ariaLabel }) => {
  const [visible, setVisible] = useState(false); // padrão: sempre ocultar
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3];

  const handleInputChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      const newValue = value.split('');
      newValue[index] = '';
      onChange(newValue.join(''));
      return;
    }
    const char = val.slice(-1);
    const newValue = value.split('');
    newValue[index] = char;
    onChange(newValue.join('').slice(0, LENGTH));
    if (index < LENGTH - 1 && char) {
      inputRefs[index + 1].current?.focus();
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }, [value]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (pastedData) {
      onChange(pastedData);
      const lastIdx = Math.min(pastedData.length - 1, LENGTH - 1);
      inputRefs[lastIdx].current?.focus();
    }
  }, [onChange]);

  return (
    <div className="flex gap-3 justify-center items-center" onPaste={handlePaste} role="group">
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          value={value[i] || ''}
          onChange={(e) => handleInputChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={ariaLabel ? `${ariaLabel} dígito ${i + 1}` : `PIN dígito ${i + 1}`}
          className="w-14 h-16 text-center text-3xl font-bold border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none bg-white shadow-sm transition-all"
        />
      ))}
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'}
        title={visible ? 'Ocultar PIN' : 'Mostrar PIN'}
      >
        {visible ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
      </button>
    </div>
  );
};
