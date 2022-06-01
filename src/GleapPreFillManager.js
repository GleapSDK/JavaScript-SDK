
export default class GleapPreFillManager {
    formPreFill = {};
  
    // GleapPreFillManager singleton
    static instance;
    static getInstance() {
      if (!this.instance) {
        this.instance = new GleapPreFillManager();
      }
      return this.instance;
    }
  }
  