var AnswerPrototype = {
  constructor: function fn0(value) {
    this._val = value;
  },
  get: function fn1() {
    return this._val;
  }
};

var lifeAnswer = Object.create(AnswerPrototype);
lifeAnswer.constructor(42);
lifeAnswer.get();
