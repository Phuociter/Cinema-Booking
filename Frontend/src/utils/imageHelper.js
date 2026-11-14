export const resolvePoster = (url) => {
  if (!url || typeof url !== 'string' || url.includes('picsum.photos')) {
    return '/backgroundImage.png';
  }
  return url;
};

export const resolveBackdrop = (url) => {
  if (!url || typeof url !== 'string' || url.includes('picsum.photos')) {
    return '/backgroundImage.png';
  }
  return url;
};

export const resolveCinemaImage = (url) => {
  if (!url || typeof url !== 'string' || url.includes('picsum.photos')) {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&fit=crop';
  }
  return url;
};

export const handleImageError = (event, fallbackUrl = '/backgroundImage.png') => {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = fallbackUrl;
};
