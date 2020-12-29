const MAX_SIZE = 8000;

export class FastQueue {
    container = new Uint8Array(MAX_SIZE);
    eIndex    = 0;
    dIndex    = 0;

    isEmpty() {
        return this.eIndex === this.dIndex;
    }

    enqueue(value) {
        if (this.eIndex + 1 === this.dIndex || (this.eIndex + 1 === MAX_SIZE && this.dIndex === 0)) {
            throw "Queue overflow";
        }

        this.container[this.eIndex++] = value;
        if (this.eIndex === MAX_SIZE) {
            this.eIndex = 0;
        }
    }

    dequeue() {
        if (this.dIndex === MAX_SIZE) {
            this.dIndex = 0;
        }

        if (this.dIndex === this.eIndex) {
            throw "The queue is empty";
        }

        return this.container[this.dIndex++];
    }
}
