import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://20.207.122.201/evaluation-service/notifications';

interface Notification {
  ID: string;
  Type: 'Placement' | 'Result' | 'Event';
  Message: string;
  Timestamp: string;
}

const weights: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1
};

function getToken(): string | null {
  try {
    const paths = [
      path.resolve(process.cwd(), 'auth.json'),
      path.resolve(process.cwd(), '../auth.json'),
      path.resolve(__dirname, '../../auth.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8')).access_token;
      }
    }
  } catch (e) {}
  return null;
}

function compare(a: Notification, b: Notification): number {
  const wa = weights[a.Type] || 0;
  const wb = weights[b.Type] || 0;

  if (wa !== wb) {
    return wa - wb;
  }

  return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
}

class MinHeap {
  private heap: Notification[] = [];

  constructor(private maxSize: number) {}

  private parent(i: number) { return Math.floor((i - 1) / 2); }
  private left(i: number) { return 2 * i + 1; }
  private right(i: number) { return 2 * i + 2; }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  private heapifyUp(i: number) {
    let curr = i;
    while (curr > 0 && compare(this.heap[curr], this.heap[this.parent(curr)]) < 0) {
      this.swap(curr, this.parent(curr));
      curr = this.parent(curr);
    }
  }

  private heapifyDown(i: number) {
    let curr = i;
    while (this.left(curr) < this.heap.length) {
      let smallest = this.left(curr);
      const right = this.right(curr);

      if (right < this.heap.length && compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (compare(this.heap[curr], this.heap[smallest]) <= 0) break;

      this.swap(curr, smallest);
      curr = smallest;
    }
  }

  push(val: Notification) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(val);
      this.heapifyUp(this.heap.length - 1);
    } else {
      if (compare(val, this.heap[0]) > 0) {
        this.heap[0] = val;
        this.heapifyDown(0);
      }
    }
  }

  getSorted(): Notification[] {
    return [...this.heap].sort((a, b) => compare(b, a));
  }
}

async function main() {
  const token = getToken();
  if (!token) {
    console.error("No token found. Run setup-auth first.");
    return;
  }

  try {
    const res = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const notifications: Notification[] = res.data.notifications;
    const heap = new MinHeap(10);

    for (const n of notifications) {
      heap.push(n);
    }

    const top10 = heap.getSorted();

    console.log("\n--- Top 10 Priority Inbox ---\n");
    top10.forEach((n, i) => {
      console.log(`${i + 1}. [${n.Type}] ${n.Message} (${n.Timestamp})`);
    });

  } catch (err: any) {
    console.error("Error fetching notifications:", err?.message);
  }
}

main();
