export async function shortenUrl(url: string) {
  const response = await fetch(
    `https://is.gd/create.php?format=simple&url=${url}`
  );
  return response.text();
}

export async function shortenUrls(urls: string[]) {
  const promises = urls.map((url) => shortenUrl(url));
  return Promise.all(promises);
}

export async function replaceUrls(text: string) {
  const urls = text.match(/https?:\/\/[^\s]+/g);
  if (urls == null) {
    return text;
  }
  const shortenedUrls = await shortenUrls(urls);
  return text.replace(/https?:\/\/[^\s]+/g, (url) => {
    const index = urls.indexOf(url);
    return shortenedUrls[index];
  });
}
