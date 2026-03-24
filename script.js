import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
 
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// Firebase 設定
const firebaseConfig = {
    apiKey: "AIzaSyAl8zPhsuME95q_wf6WFbDFODx1ykFVLYI",
    authDomain: "grokdb2.firebaseapp.com",
    projectId: "grokdb2",
    storageBucket: "grokdb2.firebasestorage.app",
    messagingSenderId: "943803302667",
    appId: "1:943803302667:web:b92af646c4dbd9e6b6580e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

getDocs(collection(db, "notes")); // 預熱用 讓第一次連線不用等太久

// 清空輸入欄位
function clearInput(){
    document.getElementById("input_title").value = "";
    document.getElementById("input_category").value = "";
    document.getElementById("input_summary").value = "";
}

// 清空輸入按鈕
document.getElementById("clear_btn").addEventListener("click", () => {
    clearInput()
});


// 新增聊天資料
document.getElementById("add_note_btn").addEventListener("click", async () => {

    if (add_note_btn.disabled) return; // 防連點
    add_note_btn.disabled = true; // 上鎖

    const title = document.getElementById("input_title").value.trim(); // trim() 會只留內容
    const category = document.getElementById("input_category").value.trim();
    const summary = document.getElementById("input_summary").value.trim();

    if (!title || !category || !summary) {
        alert("請輸入完整資料");
        add_note_btn.disabled = false; // 解鎖
        return;
    }

    
    try {
        await addDoc(collection(db, "notes"), {
            title,
            category,
            summary,
            createdAt: serverTimestamp() // 比較準的時間
        });

        clearInput()

    } catch (error) {
        console.error("新增失敗:", error);
        alert("新增失敗，請看 console");
    }

    add_note_btn.disabled = false; // 解鎖
});


// 詳細面板
let unsubscribeChat = null;

function openDetailPanel(id, data) { // 提供頁面格式 載入資料進來

    const overlay = document.getElementById("overlay");
    overlay.classList.add("open");

    const panel = document.getElementById("detail_panel");
    panel.classList.add("open"); // 加入 open 類別 才會彈出來

    document.getElementById("detail_title").value = data.title || "";
    document.getElementById("detail_category").value = data.category || "";
    document.getElementById("detail_summary").value = data.summary || "";

    panel.dataset.id = id; // 把對應的 id 導入

    // 先取消舊監聽
    if (unsubscribeChat) unsubscribeChat();

    const chat_list = document.getElementById("chat_list");
    chat_list.innerHTML = "";

    // 照創建時間排序
    const chatQuery = query(
        collection(db, "notes", id, "chats"),
        orderBy("createdAt")
    ); 

    // 載入每條聊天訊息
    unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
        chat_list.innerHTML = "";

        /*
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();

            const msg = document.createElement("div");
            msg.classList.add("chat-message"); // 加 chat-message 類別
            msg.textContent = chat.text;

            chat_list.appendChild(msg);
        });
        */
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();

            const msg = document.createElement("div");
            msg.classList.add("chat-message");
            msg.textContent = chat.text;

            // 右鍵事件
            msg.addEventListener("contextmenu", async (e) => {
                    e.preventDefault(); // 阻止預設右鍵選單

                    const confirmDelete = confirm("要刪除這則訊息嗎？");
                    if (!confirmDelete) return;

                    try {
                        await deleteDoc(docSnap.ref);
                    } catch (error) {
                        console.error("刪除聊天失敗:", error);
                        alert("刪除失敗");
                }
            });

            chat_list.appendChild(msg);
        });

        // 自動滾到底
        chat_list.scrollTop = chat_list.scrollHeight;
    });
}

document.getElementById("send_chat_btn").addEventListener("click", async () => {

    if (send_chat_btn.disabled) return; // 防連點
    send_chat_btn.disabled = true; // 上鎖

    const panel = document.getElementById("detail_panel");
    const noteId = panel.dataset.id; // 點到的那個 note 的 id

    const input = document.getElementById("chat_input");
    const text = input.value.trim();

    if (!text) {
        send_chat_btn.disabled = false; // 解鎖
        return;
    }

    try {
        await addDoc(collection(db, "notes", noteId, "chats"), {
            text,
            createdAt: serverTimestamp()
        });

        input.value = "";

    } catch (error) {
        console.error("聊天新增失敗:", error);
    }

    send_chat_btn.disabled = false; // 解鎖
});

// 再輸入時按 enter 可以送出
document.getElementById("chat_input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("send_chat_btn").click(); // 執行點擊送出訊息
    }
});

// 關閉
document.getElementById("close_btn").addEventListener("click", () => {
    closePanel();
});

// 儲存修改
document.getElementById("save_btn").addEventListener("click", async () => {
    const panel = document.getElementById("detail_panel");
    const id = panel.dataset.id;

    const newTitle = document.getElementById("detail_title").value.trim();
    const newCategory = document.getElementById("detail_category").value.trim();
    const newSummary = document.getElementById("detail_summary").value.trim();

    if (!newTitle || !newCategory || !newSummary) {
        alert("請填完整資料");
        return;
    }

    try {
        await updateDoc(doc(db, "notes", id), {
            title: newTitle,
            category: newCategory,
            summary: newSummary
        });

        panel.classList.remove("open"); // 收回 detail panel
        document.getElementById("overlay").classList.remove("open");

    } catch (error) {
        console.error("更新失敗:", error);
        alert("更新失敗");
    }
});


// 即時監聽資料（修正版）
const note_list = document.getElementById("note_list");

// 確保 createdAt 存在 新增的放在上面
const q = query(
    collection(db, "notes"),
    orderBy("createdAt", "desc")
);

// 加入錯誤處理
onSnapshot(
    q,
    (snapshot) => {
        note_list.innerHTML = "";

        snapshot.forEach(docSnap => {
            const data = docSnap.data();


            const note = document.createElement("div");
            note.classList.add("note");
            note.dataset.id = docSnap.id;


            const deleteBtn = document.createElement("button"); // 刪除按鈕
            deleteBtn.classList.add("delete-btn");
            deleteBtn.textContent = "✕";


            // 防止點刪除時觸發卡片點擊
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation(); // 阻止當前事件繼續進行捕捉

                const confirmDelete = confirm("確定要刪除嗎？");
                if (!confirmDelete) return;

                try {
                    /*
                    const chatsRef = collection(db, "notes", docSnap.id, "chats");
                    const chatSnapshot = await getDocs(chatsRef);

                    chatSnapshot.forEach(async (chatDoc) => {
                        await deleteDoc(chatDoc.ref);
                    });
                    await deleteDoc(doc(db, "notes", docSnap.id));
                    */
                   const chatsRef = collection(db, "notes", docSnap.id, "chats"); // 先刪掉每條聊天內容
                   const chatSnapshot = await getDocs(chatsRef);

                    await Promise.all(
                        chatSnapshot.docs.map(chatDoc => deleteDoc(chatDoc.ref))
                    );

                    await deleteDoc(doc(db, "notes", docSnap.id)); // 再刪掉整個 note
                    
                } catch (error) {
                    console.error("刪除失敗:", error);
                    alert("刪除失敗");
                }
            });

            // 內容
            const content = document.createElement("div");
            content.textContent =
                "標題 : " + (data.title || "") + '\n' +
                "類別 : " + (data.category || "") + '\n' +
                "摘要 : " + (data.summary || "");


            // 點擊卡片（開編輯）
            note.addEventListener("click", () => {
                openDetailPanel(docSnap.id, docSnap.data()); // 載入點到的這張卡的資訊進 detail panel
            });

            // 組裝
            note.appendChild(deleteBtn);
            note.appendChild(content);

            note_list.appendChild(note);
        });
    },
    (error) => {
        console.error("onSnapshot 錯誤:", error);
        alert("資料讀取失敗，請查看 console");
    }
);


document.getElementById("overlay").addEventListener("click", (e) => {
    //const panel = document.getElementById("detail_panel");

    // 如果點到的是 panel 本身就不關
    if (e.target.closest("#detail_panel")) return;

    // 點到外面才關閉
    closePanel();
});


function closePanel() {
    document.getElementById("overlay").classList.remove("open");
    document.getElementById("detail_panel").classList.remove("open");

    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
}

