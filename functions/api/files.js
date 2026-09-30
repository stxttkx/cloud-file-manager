export async function onRequestGet({ env }) {
  const { results: files } = await env.DB
    .prepare(`SELECT * FROM files ORDER BY updated_at DESC`).all();
  const { results: platforms } = await env.DB
    .prepare(`SELECT * FROM platforms`).all();

  const map = {};
  for (const p of platforms) (map[p.file_id] ||= []).push(p);

  const data = files.map(f => ({
    id: f.id,
    name: f.name,
    cover: f.cover,
    size: formatSize(f.size_bytes),
    type: f.file_type,
    tags: f.tags ? f.tags.split(",").filter(Boolean) : [],
    remark: f.remark,
    updated_at: f.updated_at,
    platforms: (map[f.id] || []).map(p => ({
      name: p.name, color: p.color, url: p.url
    }))
  }));

  return Response.json(data);
}

function formatSize(bytes){
  if(!bytes) return "0 B";
  const u = ["B","KB","MB","GB","TB"];
  let i = 0, n = bytes;
  while(n >= 1024 && i < u.length-1){ n /= 1024; i++; }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}
