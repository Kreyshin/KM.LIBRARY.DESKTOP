const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const uploadsRoot = path.join(__dirname, '..', 'uploads');

async function createThumbnail(obraId, coverPath) {
  if (!coverPath) return null;
  const source = path.join(uploadsRoot, obraId, path.basename(coverPath));
  if (!fs.existsSync(source)) return null;
  const basename = path.parse(source).name.replace(/-thumb$/, '');
  const filename = `${basename}-thumb.webp`;
  const target = path.join(uploadsRoot, obraId, filename);
  if (!fs.existsSync(target)) {
    await sharp(source).rotate().resize({ width: 320, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 3 }).toFile(target);
  }
  return `/uploads/${obraId}/${filename}`;
}

async function run() {
  const obras = await prisma.obra.findMany({ where: { coverPath: { not: null }, thumbnailPath: null }, select: { id: true, coverPath: true } });
  const volumes = await prisma.volume.findMany({ where: { coverPath: { not: null }, thumbnailPath: null }, select: { id: true, obraId: true, coverPath: true } });
  let updatedObras = 0;
  let updatedVolumes = 0;
  for (const obra of obras) {
    const thumbnailPath = await createThumbnail(obra.id, obra.coverPath);
    if (thumbnailPath) { await prisma.obra.update({ where: { id: obra.id }, data: { thumbnailPath } }); updatedObras += 1; }
  }
  for (const volume of volumes) {
    const thumbnailPath = await createThumbnail(volume.obraId, volume.coverPath);
    if (thumbnailPath) { await prisma.volume.update({ where: { id: volume.id }, data: { thumbnailPath } }); updatedVolumes += 1; }
  }
  console.log(`Miniaturas actualizadas: obras=${updatedObras}, tomos=${updatedVolumes}`);
}

run().finally(() => prisma.$disconnect());
