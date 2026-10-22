import React from 'react';

export const PageHeader = ({ title, description, children }) => {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs text-zinc-400">
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
