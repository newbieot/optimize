const assert = require('node:assert/strict');
function calc({cw=10, route=14000, tertiary=2500, margin=.15, direct=500000}){
  const opt=1000+1000+route*cw+tertiary*cw+2875*cw;
  const overhead=opt*.05,cof=opt*30/365*.08,base=opt+overhead+cof,total=base+direct,dpp=total/(1-margin),project=dpp*1.011,profit=dpp-total;
  return {opt,overhead,cof,base,total,dpp,project,profit,projectKg:project/cw};
}
const r=calc({});
assert.equal(Math.round(r.total), 706825);
assert.equal(Math.round(r.dpp), 831558);
assert.equal(Math.round(r.profit), 124734);
assert.ok(Number.isFinite(r.projectKg));
assert.equal(Number.isFinite(0/0), false);
console.log('Formula regression tests passed', r);
