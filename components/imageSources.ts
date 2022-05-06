import * as fs from 'fs/promises'
import * as path from 'path'

export const getLevelImages = async (dir: string, base: string) => {
    const files = await fs.readdir(dir)
    return files.map(name => path.join(base, name).replaceAll('\\', '/'))
}