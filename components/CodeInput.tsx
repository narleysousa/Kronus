import React, { useRef, useCallback } from 'react';

const LENGTH = 6;

interface CodeInputProps {
  value: string;
  onChange: (val: string) => void;
  'aria-label'?: string;
}

export const CodeInput: React.FC<CodeInputProps> = ({ value, onChange, 'aria-label': ariaLabel }) => {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3, ref4, ref5];

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
    <div className="flex gap-2 justify-center flex-wrap" onPaste={handlePaste} role="group">
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          value={value[i] || ''}
          onChange={(e) => handleInputChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={ariaLabel ? `${ariaLabel} dígito ${i + 1}` : `Código dígito ${i + 1}`}
          className="w-11 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white shadow-sm transition-all"
        />
      ))}
    </div>
  );
};
