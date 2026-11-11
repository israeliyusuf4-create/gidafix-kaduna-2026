import fs from 'node:fs';
import path from 'node:path';
import { seedData } from './core.mjs';
export class Store {
  constructor(file, demo=false) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), {recursive:true});
    if(!fs.existsSync(file)) this.save(seedData(demo));
  }
  read() { return JSON.parse(fs.readFileSync(this.file,'utf8')); }
  save(data) {
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data,null,2), {mode:0o600});
    fs.renameSync(temporary,this.file);
  }
  change(callback) { const data=this.read(); const result=callback(data); this.save(data); return {result,data}; }
}
