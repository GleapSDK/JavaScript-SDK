import { ElementPicker } from "pick-dom-element";
import unique from 'unique-selector';

class GleapAdminHelper {
  picker = null;
  onElementPicked = null;

  stopPicker = () => {
    if (this.picker) {
      this.picker.stop();
      this.picker = null;
      return;
    }
  }

  startPicker = () => {
    this.stopPicker();
    var self = this;

    const style = { borderColor: "#2142E7", background: "transparent", borderWidth: "4px", borderRadius: "5px" };
    this.picker = new ElementPicker({ style });
    this.picker.start({
      onClick: (el) => {
        try {
          var selector = unique(el);
          self.onElementPicked && self.onElementPicked(selector);
        } catch (e) { }
      },
      elementFilter: (el) => {
        if (el.classList.contains('gleap-admin-collapse-ui') || el.closest('.gleap-admin-collapse-ui')) {
          return false;
        }
        return true;
      }
    });
  };

  setMode = (mode) => {
    this.mode = mode;
    if (mode === 'navigate') {
      this.stopPicker();
    }
    if (mode === 'picker') {
      this.startPicker();
    }
  }
}

export default GleapAdminHelper;
