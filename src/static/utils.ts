import fs from 'fs';
import path from 'path';

export const deleteFile = (file: string) => {
  const filePath = path.join(process.cwd(), 'storage', file);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
    }
  });
};
