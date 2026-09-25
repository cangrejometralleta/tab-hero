import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strikeText,milestoneText} from './hype.js';
import {setLang} from './i18n.js';
test('strike messages climb and stay at the top',()=>{setLang('en');assert.equal(strikeText(1),'STRIKE!');assert.equal(strikeText(2),'DOUBLE STRIKE!');assert.equal(strikeText(7),strikeText(40));});
test('milestones at 10, 25, 50, 100 and multiples of 100',()=>{for(const n of [10,25,50,100,200,300,1000])assert.ok(milestoneText(n));for(const n of [1,9,20,75,150,250])assert.equal(milestoneText(n),null);});
test('Spanish is available for every message',async()=>{const {messages}=await import('./i18n.js');assert.deepEqual(Object.keys(messages.es).sort(),Object.keys(messages.en).sort());setLang('es');assert.equal(strikeText(2),'STRIKE DOBLE!');assert.equal(milestoneText(200),'¡200! ¡HISTÓRICO!');setLang('en');});
