// Pure selection tests; no network, deployment, or generated site changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {};
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'site.js'), 'utf8');
assert.equal(source.replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, 'dist/site.js'), 'utf8').replace(/\r\n/g, '\n'));
// site.js depends on the shared contract script, loaded first on every page.
vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/playmaker-data.js'), 'utf8'), context);
vm.runInNewContext(source, context);
const config = {defaultEventId: '200', eventOrder: ['100', '200', 'winter-plan'], events: {
  '100': {eventName: 'Playmakers Cup', startDate: '2099-01-01', archived: false},
  '200': {eventName: 'Winter Fest', startDate: '2099-02-01', archived: false},
  'winter-plan': {eventName: 'Winter Fest planned', startDate: '2099-01-02', archived: false}
}};
assert.equal(context.getUpcomingEvent(config).eventId, '200', 'explicit current wins over nearest date');
assert.equal(config.events['100'].archived, false, 'choosing current does not archive others');
config.events['200'].startDate = '2020-01-01';
assert.equal(context.getUpcomingEvent(config).eventId, '200', 'dates do not silently advance current');
config.defaultEventId = '';
assert.equal(context.getUpcomingEvent(config), null, 'clearing current does not auto-promote another');
config.defaultEventId = 'winter-plan';
assert.equal(context.getUpcomingEvent(config), null, 'placeholder is never featured as current');
config.defaultEventId = '200';
config.events['200'].archived = true;
assert.equal(context.getUpcomingEvent(config), null, 'archived event cannot be current');
delete config.defaultEventId;
assert.equal(context.getUpcomingEvent(config).eventId, '100', 'legacy config retains upcoming-date fallback');
console.log('Current-event selection: 7 checks passed.');
