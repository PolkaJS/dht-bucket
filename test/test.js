const test   = require('tape');
const Bucket = require('../lib/bucket').default;

test('instantiate', function (t) {
    t.plan(5);

    const bucket = new Bucket();

    t.true(Buffer.isBuffer(bucket.localNodeId), 'bucket type is a buffer');
    t.equal(bucket.localNodeId.length, 20, 'bucket.localNodeId.length');
    t.equal(JSON.stringify(bucket.root), JSON.stringify({
      contacts: [],
      dontSplit: false,
      high: undefined,
      low: undefined }), 'check bucket root');
    t.equal(bucket.pingSize, 3, 'check bucket ping size');
    t.equal(bucket.bucketSize, 20, 'check bucket size');
});

test('instantiate with options', function (t) {
    t.plan(5);

    const bucket = new Bucket({
      localNodeId: Buffer.from([0x01, 0x02]),
      bucketSize:  10,
      pingSize:    10
    });

    t.true(Buffer.isBuffer(bucket.localNodeId), 'bucket type is a buffer');
    t.equal(bucket.localNodeId.length, 2, 'bucket.localNodeId.length');
    t.equal(JSON.stringify(bucket.root), JSON.stringify({
      contacts: [],
      dontSplit: false,
      high: undefined,
      low: undefined }), 'check bucket root');
    t.equal(bucket.pingSize, 10, 'check bucket ping size');
    t.equal(bucket.bucketSize, 10, 'check bucket size');
});
