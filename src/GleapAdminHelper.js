import ElementPicker from './ElementPicker';
import { buildStableSelector } from './GleapTourSelector';

class GleapAdminHelper {
  picker = null;
  onElementPicked = null;

  stopPicker = () => {
    if (this.picker) {
      this.picker.stop();
      this.picker = null;
      return;
    }
  };

  startPicker = () => {
    this.stopPicker();
    var self = this;

    const style = {
      borderColor: '#2142E7',
      background: 'transparent',
      borderWidth: '4px',
      borderRadius: '5px',
    };
    this.picker = new ElementPicker({ style });
    this.picker.start({
      useShadowDOM: false,
      onClick: (el) => {
        try {
          let selector;
          // Walk a few ancestors so clicks on an inner icon/span inside an
          // element tagged with `data-gleap-tour` still pick the tagged element.
          // Bounded so a high-level layout wrapper carrying the attribute can't
          // hijack clicks on an unrelated descendant.
          const maxAncestorWalk = 3;
          let anchor = null;
          let cursor = el;
          for (let i = 0; cursor && i <= maxAncestorWalk; i++) {
            if (cursor.getAttribute && cursor.getAttribute('data-gleap-tour')) {
              anchor = cursor;
              break;
            }
            cursor = cursor.parentElement;
          }
          if (anchor) {
            const tourId = anchor.getAttribute('data-gleap-tour');
            selector = `[data-gleap-tour="${tourId}"]`;
          } else {
            selector = buildStableSelector(el);
          }

          self.onElementPicked && self.onElementPicked(selector);
        } catch (e) {
          console.error('Error while getting unique selector', e);
        }
      },
      elementFilter: (el) => {
        if (el.classList.contains('gleap-admin-collapse-ui') || el.closest('.gleap-admin-collapse-ui')) {
          return false;
        }
        return true;
      },
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
  };
}

export default GleapAdminHelper;
