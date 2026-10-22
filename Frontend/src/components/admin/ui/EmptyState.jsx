import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon,
  title = 'Không có dữ liệu',
  description = 'Hiện chưa có mục nào phù hợp với bộ lọc hiện tại.',
  action,
}) => {
  const IconComponent = icon || Inbox;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 rounded-md border border-dashed border-zinc-800">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 mb-3">
        <IconComponent className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-zinc-400 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
