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

// Map types to numeric weights
const TYPE_WEIGHT: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1
};

// Helper to get auth token
function getAccessToken(): string | null {
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

// Compare two notifications to determine which one is "greater" (should be prioritized higher)
// Returns > 0 if a > b, < 0 if a < b, 0 if equal
function comparePriority(a: Notification, b: Notification): number {
  const weightA = TYPE_WEIGHT[a.Type] || 0;
  const weightB = TYPE_WEIGHT[b.Type] || 0;
  
  if (weightA !== weightB) {
    return weightA - weightB;
  }
  
  // If weights are equal, newer timestamp wins
  const timeA = new Date(a.Timestamp).getTime();
  const timeB = new Date(b.Timestamp).getTime();
  return timeA - timeB;
}

// A simple Min-Heap for maintaining top N elements
class MinHeap {
  private heap: Notification[] = [];
  
  constructor(private maxSize: number) {}

  private getParent(i: number) { return Math.floor((i - 1) / 2); }
  private getLeft(i: number) { return 2 * i + 1; }
  private getRight(i: number) { return 2 * i + 2; }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  private heapifyUp(index: number) {
    let curr = index;
    while (curr > 0 && comparePriority(this.heap[curr], this.heap[this.getParent(curr)]) < 0) {
      this.swap(curr, this.getParent(curr));
      curr = this.getParent(curr);
    }
  }

  private heapifyDown(index: number) {
    let curr = index;
    while (this.getLeft(curr) < this.heap.length) {
      let smallest = this.getLeft(curr);
      const right = this.getRight(curr);
      
      if (right < this.heap.length && comparePriority(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (comparePriority(this.heap[curr], this.heap[smallest]) <= 0) break;
      
      this.swap(curr, smallest);
      curr = smallest;
    }
  }

  public push(val: Notification) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(val);
      this.heapifyUp(this.heap.length - 1);
    } else {
      // If new value is strictly greater than the minimum element in the heap
      if (comparePriority(val, this.heap[0]) > 0) {
        this.heap[0] = val;
        this.heapifyDown(0);
      }
    }
  }

  public getSortedElements(): Notification[] {
    // Return a sorted copy (Highest priority first)
    return [...this.heap].sort((a, b) => comparePriority(b, a));
  }
}

async function runPriorityInbox() {
  const token = getAccessToken();
  if (!token) {
    console.error("No access token found. Please run setup-auth.");
    return;
  }

  try {
    console.log("Fetching notifications from API...");
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const notifications: Notification[] = response.data.notifications;
    console.log(`Received ${notifications.length} notifications. Processing Priority Inbox...`);

    // MinHeap to keep top 10
    const top10Heap = new MinHeap(10);
    
    for (const notif of notifications) {
      top10Heap.push(notif);
    }

    const top10 = top10Heap.getSortedElements();

    console.log("\n==== PRIORITY INBOX (TOP 10) ====\n");
    top10.forEach((n, i) => {
      console.log(`${i + 1}. [${n.Type}] ${n.Message} (Time: ${n.Timestamp})`);
    });
    
  } catch (err: any) {
    console.error("Failed to fetch notifications:", err?.message);
  }
}

runPriorityInbox();
