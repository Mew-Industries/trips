import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('done-log.js', root), 'utf8');
export const {matchDoneItem} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const context = {window: {}};
vm.runInNewContext(readFileSync(new URL('data/reels.js', root), 'utf8'), context);
export const reels = context.window.SOURCE_THINGS || [];
export const places = JSON.parse(readFileSync(new URL('data/saved-places.json', root)));
const html = readFileSync(new URL('index.html', root), 'utf8');
const start = html.indexOf('[', html.indexOf('const destinations ='));
let depth = 0, quote = false, end;
for(let i=start;i<html.length;i++) {const c=html[i];if(quote){if(c==='\\')i++;else if(c==='"')quote=false;continue;}if(c==='"'){quote=true;continue;}if(c==='[')depth++;if(c===']'&&!--depth){end=i+1;break;}}
export const destinations = JSON.parse(html.slice(start,end));
if (process.argv[2]) {
 const hit = matchDoneItem(JSON.parse(process.argv[2]), destinations, places, reels);
 console.log(JSON.stringify(hit?.act.coords ? {name:hit.act.text,coords:hit.act.coords} : null));
}
