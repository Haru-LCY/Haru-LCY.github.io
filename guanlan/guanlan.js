(() => {
  const contents = document.querySelector('.volume-toc');
  if (!contents) return;
  const works = document.querySelectorAll('.volume-prose .gallery-essay__work[id]');
  if (!works.length) return;
  const list = document.createElement('ol');
  works.forEach((work) => {
    const title = work.querySelector('h2');
    if (!title) return;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${work.id}`;
    link.textContent = title.textContent;
    item.append(link);
    list.append(item);
  });
  contents.append(list);
  contents.hidden = false;
})();
