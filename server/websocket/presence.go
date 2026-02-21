package websocket

import (
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

type Client struct {
    UserID   string
    Conn     *websocket.Conn
    LastSeen time.Time
    mu       sync.Mutex
}

type PresenceManager struct {
    clients map[string]*Client
    mu      sync.RWMutex
}

var Manager = &PresenceManager{
    clients: make(map[string]*Client),
}

func (pm *PresenceManager) Register(userID string, conn *websocket.Conn) *Client {
    pm.mu.Lock()
    defer pm.mu.Unlock()
    client := &Client{
        UserID:   userID,
        Conn:     conn,
        LastSeen: time.Now(),
    }
    pm.clients[userID] = client
    log.Printf("User %s connected", userID)
    return client
}

func (pm *PresenceManager) Unregister(userID string) {
    pm.mu.Lock()
    defer pm.mu.Unlock()
    delete(pm.clients, userID)
    log.Printf("User %s disconnected", userID)
}

func (pm *PresenceManager) IsActive(userID string) bool {
    pm.mu.RLock()
    defer pm.mu.RUnlock()
    client, ok := pm.clients[userID]
    if !ok {
        return false
    }
    return time.Since(client.LastSeen) < 30*time.Second
}

func (pm *PresenceManager) UpdateLastSeen(userID string) {
    pm.mu.Lock()
    defer pm.mu.Unlock()
    if client, ok := pm.clients[userID]; ok {
        client.LastSeen = time.Now()
    }
}

func (pm *PresenceManager) ActiveUsers() []string {
    pm.mu.RLock()
    defer pm.mu.RUnlock()
    
    active := []string{}
    for userID, client := range pm.clients {
        if time.Since(client.LastSeen) < 30*time.Second {
            active = append(active, userID)
        }
    }
    return active
}




func (pm *PresenceManager) HandleConnection(c *gin.Context) {

    
    userID := c.GetString("user_id")
    if userID == "" {
        c.AbortWithStatus(http.StatusUnauthorized)
        return
    }

    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocket upgrade error: %v", err)
        return
    }
    defer conn.Close()

    client := pm.Register(userID, conn)
    defer pm.Unregister(userID)

    conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    conn.SetPongHandler(func(string) error {
        pm.UpdateLastSeen(userID)
        conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })

    ticker := time.NewTicker(25 * time.Second)
    defer ticker.Stop()

    go func() {
        for range ticker.C {
            client.mu.Lock()
            err := conn.WriteMessage(websocket.PingMessage, nil)
            client.mu.Unlock()
            if err != nil {
                conn.Close()
                return
            }
        }
    }()

    for {
        _, _, err := conn.ReadMessage()
        if err != nil {
            break
        }
        pm.UpdateLastSeen(userID)
    }
}
