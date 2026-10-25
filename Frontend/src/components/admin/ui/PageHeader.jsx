import React from 'react';

export const PageHeader = ({ title, description, badge, children, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/50">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
