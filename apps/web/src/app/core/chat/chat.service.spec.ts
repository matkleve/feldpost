import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  it('should be created', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ChatService);
    expect(service).toBeTruthy();
    expect(service.liveMessages()).toEqual([]);
    expect(service.typingUserIds().size).toBe(0);
  });
});
