import { useEffect, useState } from 'react';
import { resolveApiAssetUrl } from '../api/axiosInstance';

export default function UserAvatar({ src, name, className }) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedSrc = resolveApiAssetUrl(src);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedSrc]);

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600 font-bold uppercase text-white ${className}`}>
      <span>{name?.trim().charAt(0) || 'U'}</span>
      {resolvedSrc && !imageFailed && (
        <img
          src={resolvedSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}
