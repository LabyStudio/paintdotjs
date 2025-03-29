class OurHistoryMementoData extends HistoryMementoData {

    constructor(context) {
        super();
        this.context = context.clone();
    }
}