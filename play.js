const Bucket = require('./lib/bucket').default;
const util   = require('util');
const crypto = require('crypto');

let seed = process.env.SEED || crypto.randomBytes(20).toString('hex')
let count = 0;

function getNextId () {
  count++;
  seed = crypto.createHash('sha1').update(seed).digest();
  return {
    host: '127.0.0.1:' + (1337 + count),
    id: seed,
    vectorClock: 0
  };
}

let b = new Bucket({ bucketSize: 3 });

b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );
b.add( getNextId() );

console.log("b", util.inspect(b.root, false, null));
console.log("b.localNodeId", b.localNodeId);

let id = getNextId().id;
console.log("id: ", id);

let f = b.findClosest(id, 7);
console.log("CLOSEST: ", f);
