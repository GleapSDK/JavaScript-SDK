/**
 * Add notification badge (pill) to favicon in browser tab
 * @url stackoverflow.com/questions/65719387/
 */
export default class GleapNotificationBadge {
    _value = 0;

    constructor() {

    }

    getCleanTitle() {
        var title = "";
        try {
            title = document.title;

            // Remove last value in title.
            if (title.indexOf("(") === 0 && title.indexOf(")") > 0) {
                title = title.substring(title.indexOf(") ") + 2, title.length);
            }
        } catch (e) { }
        
        return title;
    }

    update() {
        if (this.value === 0) {
            document.title = this.getCleanTitle();
        } else {
            document.title = `(${this._value}) ${this.getCleanTitle()}`;
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        try {
            this._value = val;
            this.update();
        } catch (e) {
            console.log(e);
        }
    }
}