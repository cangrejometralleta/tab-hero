import {test} from 'node:test';
import assert from 'node:assert/strict';
import {holdState,extendSustain} from './sustain.js';
test('hold must remain pressed through its tail',()=>{const n={at:3,duration:1};assert.equal(holdState(n,3.5,true),'holding');assert.equal(holdState(n,3.5,false),'broken');assert.equal(holdState(n,4,true),'complete');assert.equal(holdState(n,3.95,false),'complete');});
test('stable tones create capped tails, pitch changes stop extension',()=>{const n={sourceAt:1,sourcePitch:60,duration:0};assert.equal(extendSustain(n,1.2,60),true);assert.equal(n.duration,0);extendSustain(n,1.6,60);assert.ok(n.duration>.59);assert.equal(extendSustain(n,1.8,62),false);assert.equal(extendSustain(n,1.8,null),false);assert.equal(extendSustain(n,4,60),false);assert.equal(n.duration,1.5);});

test('casual release grace is generous but bounded for short notes',()=>{assert.equal(holdState({at:3,duration:1},3.81,false),'complete');assert.equal(holdState({at:3,duration:1},3.79,false),'broken');assert.equal(holdState({at:3,duration:.35},3.1,false),'broken');assert.equal(holdState({at:3,duration:.35},3.22,false),'complete');});
