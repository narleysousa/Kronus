import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => (
  <footer
    className={`shrink-0 py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 ${className}`.trim()}
    role="contentinfo"
  >
    © {new Date().getFullYear()} Narley Almeida Consulting. Todos os direitos reservados.
  </footer>
);
