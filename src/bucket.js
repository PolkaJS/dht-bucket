// @flow

import { randomBytes } from 'crypto';
const { EventEmitter } = require('events');

export type Contact = {
  host:        string, // '127.0.0.1:1337'
  id:          Buffer, // '91810E6B96C6512202A7AB416C3A04B43BA3E343'
  vectorClock?: number // 0
}

export type Node = {
  contacts:  Array<Contact>;
  dontSplit: bool;
  high?:     Node;
  low?:      Node;
}

export type BucketOptions = {
  bucketSize?:  number;
  pingSize?:    number;
  localNodeId?: Buffer;
}

export default class Bucket extends EventEmitter {
  bucketSize:  number;
  localNodeId: Buffer;
  pingSize:    number;
  root:        Node;
  constructor(options: BucketOptions) {
    super();
    if (!(this instanceof Bucket))
      return new Bucket(options);
    options          = options || {};

    this.root        = createNode();
    this.localNodeId = options.localNodeId || randomBytes(20);
    this.bucketSize  = options.bucketSize  || 20;
    this.pingSize    = options.pingSize    || 3;
  }

  arbitrate(incumbent: Contact, candidate: Contact): Contact | null {
    if (incumbent.vectorClock && candidate.vectorClock)
      return (incumbent.vectorClock > candidate.vectorClock) ? incumbent : candidate;
    return null;
  }

  distance(firstId: Buffer, secondId: Buffer) {
    if (firstId.length !== secondId.length) throw Error('id lengths are not equal');

    let distance = 0;
    for (let i = 0 ; i < firstId.length; ++i) distance = distance * 256 + (firstId[i] ^ secondId[i]);
    return distance;
  }

  add(contact: Contact) {
    let node: Node = this.root;
    let bitIndex = 0;
    // traverse the tree for where to place the contact
    while (node.contacts === null) {
      node = this._getNode(bitIndex++, contact.id, node);
    }
    // check if the contact already exists TODO: study contact id's and choose the one with a better vectorClock
    if (node.contacts.indexOf(contact) > -1)
      return null;
    // bucket has room
    if (node.contacts.length < this.bucketSize) {
      node.contacts.push(contact);
      this.emit('added', contact);
      return this;
    }
    // bucket is full
    if (node.dontSplit)
      this.emit('ping', node.contacts.slice(0, this.pingSize), contact);
    else {
      this._split(bitIndex, node);
      this.add(contact);
    }
    return this;
  }

  // $FlowFixMe (Flow is confused; We will never reach an empty node high or low)
  _getNode(bitIndex: number, id: Buffer, node: Node): Node {
    const byte   = ~~(bitIndex / 8); // which byte to look at
    const bit    = bitIndex % 8;     // which bit within the byte to look at
    const idByte = id[byte];         // grab the byte from the contact
    if (idByte & Math.pow(2, (7 - bit))) return node.high; // check that the bit is set
    return node.low;
  }

  _split(bitIndex: number, node: Node) {
    node.low  = createNode();
    node.high = createNode();
    while (node.contacts.length) { // distribute the nodes appropriately
      let nodeContact = node.contacts.pop();
      this._getNode(bitIndex, nodeContact.id, node).contacts.push(nodeContact);
    }
    node.contacts = null;
    const localNode = this._getNode(bitIndex, this.localNodeId, node);
    (localNode === node.low)        // Find the path that our local node follows // $FlowFixMe (darn confused flow, common buddy...)
      ? node.high.dontSplit = true  // and if it is low, than high cannot split  // $FlowFixMe
      : node.low.dontSplit  = true; // otherwise low cannot split
  }

  count(): number {
    return this._count(this.root);
  }

  _count(node: Node): number {
    let count = 0;
    count += (node.low)  ? this._count(node.low)  : 0;
    count += (node.high) ? this._count(node.high) : 0;
    return count;
  }

  getContact(id: Buffer): Contact {
    let node: Node = this.root;
    let bitIndex = 0;
    while (node.contacts === null) {
      node = this._getNode(bitIndex++, id, node);
    }
    return node.contacts.filter((contact) => contact.id === id)[0];
  }

  findClosest(id: Buffer, n: number): Array<Contact> {
    const self = this;

    let node: Node = this.root;
    let bitIndex = 0;
    let contacts = node.contacts || [];
    // traverse the tree and pick up contacts on the way
    while (node.contacts === null) {
      let nextNode = this._getNode(bitIndex++, id, node);
      (nextNode === node.high)                                  // Let's pick up contacts on the way $FlowFixMe
        ? contacts = contacts.concat(node.low.contacts  || [])  // and add them to our list.         $FlowFixMe (flow being a little ignorant again)
        : contacts = contacts.concat(node.high.contacts || []);
      node = nextNode;
    }
    contacts = contacts.concat(node.contacts || []);      // lastly lets pick up the absolutely closes contacts
    return sort(contacts).slice(0, n);

    function sort (contacts: Array<Contact>): Array<Contact> {
      return contacts.sort(function (a, b) {
        return self.distance(a.id, id) - self.distance(b.id, id);
      });
    }
  }

  removeContact(id: Buffer) {
    let node: Node = this.root;
    let bitIndex = 0;
    while (node.contacts === null) {
      node = this._getNode(bitIndex++, id, node);
    }
    let index = -1;
    node.contacts.forEach((contact, i) => (contact.id === id) ? index = i : null);
    if (index >= 0) {
      let contact = node.contacts.splice(index, 1);
      this.emit('removed', contact[0]);
    }
    return this;
  }
}

function createNode(node?: Node) {
  return {
    contacts:  (node && node.contacts)  ? node.contacts  : [],
    dontSplit: (node && node.dontSplit) ? node.dontSplit : false,
    high:      (node && node.high)      ? node.high      : undefined,
    low:       (node && node.low)       ? node.low       : undefined
  };
}
