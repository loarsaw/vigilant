package sse

import (
	"sync"
)

type Manager struct {
	adminClients     map[chan any]struct{}
	candidateClients map[string]map[chan any]struct{}
	mu               sync.RWMutex
}

var Global = &Manager{
	adminClients:     make(map[chan any]struct{}),
	candidateClients: make(map[string]map[chan any]struct{}),
}

func (m *Manager) AddAdmin(ch chan any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.adminClients[ch] = struct{}{}
}

func (m *Manager) RemoveAdmin(ch chan any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.adminClients, ch)
	close(ch)
}

func (m *Manager) BroadcastAdmin(payload any) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for ch := range m.adminClients {
		select {
		case ch <- payload:
		default:
		}
	}
}

func (m *Manager) AddCandidate(candidateID string, ch chan any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.candidateClients[candidateID]; !ok {
		m.candidateClients[candidateID] = make(map[chan any]struct{})
	}
	m.candidateClients[candidateID][ch] = struct{}{}
}

func (m *Manager) RemoveCandidate(candidateID string, ch chan any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if clients, ok := m.candidateClients[candidateID]; ok {
		delete(clients, ch)
		if len(clients) == 0 {
			delete(m.candidateClients, candidateID)
		}
	}
	close(ch)
}

func (m *Manager) BroadcastCandidate(candidateID string, payload any) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for ch := range m.candidateClients[candidateID] {
		select {
		case ch <- payload:
		default:
		}
	}
}