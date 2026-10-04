import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState } from '@/lib/storage';
import { getPublicSupabaseServerClient } from '@/lib/supabase';
import { MessagingConfig } from '@/types/whiteboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CachedAuth {
  userId: string;
  email: string;
  name: string;
  timestamp: number;
}

let cachedBoardRunnerAuth: CachedAuth | null = null;

// Helper to authenticate Board Runner with Supabase Auth
async function authenticateBoardRunner(config: MessagingConfig): Promise<{ userId: string; name: string } | null> {
  const now = Date.now();
  if (
    cachedBoardRunnerAuth &&
    cachedBoardRunnerAuth.email === config.boardRunnerEmail &&
    now - cachedBoardRunnerAuth.timestamp < 1000 * 60 * 15 // 15 min cache
  ) {
    return { userId: cachedBoardRunnerAuth.userId, name: cachedBoardRunnerAuth.name };
  }

  const supabase = getPublicSupabaseServerClient(config.supabaseUrl, config.supabaseAnonKey);
  if (!supabase) return null;

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: config.boardRunnerEmail,
      password: config.boardRunnerPassword
    });

    if (authError || !authData.user) {
      console.warn('Failed to authenticate Board Runner in Supabase Auth:', authError?.message);
      return null;
    }

    const userId = authData.user.id;
    let name = config.boardRunnerName || 'OR Board Runner';

    // Query profiles table for name if available
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        name = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || name;
      }
    } catch {
      // profiles query fallback
    }

    cachedBoardRunnerAuth = {
      userId,
      email: config.boardRunnerEmail,
      name,
      timestamp: now
    };

    return { userId, name };
  } catch (err) {
    console.error('Error during Board Runner auth:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'check_status';
  const board = await loadBoardState();
  const config = board.messagingConfig || {
    enabled: false,
    boardRunnerEmail: 'boardrunner@boardrunner.com',
    boardRunnerPassword: 'boardrunner@boardrunner.com',
    boardRunnerName: 'OR Board Runner',
    pushEndpoint: 'https://pinecone-backend-7m1p.onrender.com/api/send-chat-push'
  };

  const supabase = getPublicSupabaseServerClient(config.supabaseUrl, config.supabaseAnonKey);

  // 1. Status Check & Optional Recipient Lookup
  if (action === 'check_status') {
    const phone = searchParams.get('phone');
    let recipientProfile: {
      id: string;
      fullName: string;
      phone?: string;
      isOnline: boolean;
      lastSeenAt?: string | null;
    } | null = null;

    if (phone && supabase && config.enabled) {
      const cleanPhone = phone.replace(/\D/g, '');
      const last10 = cleanPhone.slice(-10);

      try {
        // Query profiles table in public schema
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, cellular_number, status, last_active_at')
          .limit(500);

        if (!error && profiles) {
          const matched = profiles.find((p: any) => {
            const userPhone = (p.cellular_number || '').replace(/\D/g, '');
            return userPhone.length >= 10 && userPhone.slice(-10) === last10;
          });

          if (matched) {
            recipientProfile = {
              id: matched.id,
              fullName: matched.full_name || `${matched.first_name || ''} ${matched.last_name || ''}`.trim() || 'Provider',
              phone: matched.cellular_number,
              isOnline: matched.status === 'online',
              lastSeenAt: matched.last_active_at || null
            };
          }
        }
      } catch (err) {
        console.warn('Error querying recipient profile from Supabase:', err);
      }
    }

    return NextResponse.json({
      enabled: config.enabled,
      boardRunnerEmail: config.boardRunnerEmail,
      boardRunnerName: config.boardRunnerName,
      pushEndpoint: config.pushEndpoint,
      cachedBoardRunnerId: cachedBoardRunnerAuth?.userId || config.cachedBoardRunnerId || null,
      recipientProfile
    });
  }

  // 2. Get Chat History for a Recipient
  if (action === 'get_chat') {
    const recipientId = searchParams.get('recipientId');
    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
    }
    if (!config.enabled || !supabase) {
      return NextResponse.json({ error: 'Messaging is disabled or Supabase is not connected' }, { status: 400 });
    }

    const auth = await authenticateBoardRunner(config);
    if (!auth) {
      return NextResponse.json({ error: 'Board Runner not authenticated in Perfect Call' }, { status: 401 });
    }

    try {
      // Step A: RPC to get or create chat
      const { data: chatId, error: rpcErr } = await supabase.rpc('get_or_create_user_chat', {
        p_user_1_id: auth.userId,
        p_user_2_id: recipientId
      });

      if (rpcErr || !chatId) {
        console.error('RPC get_or_create_user_chat error:', rpcErr);
        return NextResponse.json({ error: 'Failed to access conversation room' }, { status: 500 });
      }

      // Step B: Fetch messages
      const { data: messages, error: msgErr } = await supabase
        .from('board_messages')
        .select('id, chat_id, sender_id, content, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50);

      // Step C: Upsert read receipt
      try {
        await supabase.from('chat_read_receipts').upsert({
          chat_id: chatId,
          user_id: auth.userId,
          last_read_at: new Date().toISOString()
        });
      } catch (receiptErr) {
        console.warn('Read receipt upsert error:', receiptErr);
      }

      return NextResponse.json({
        chatId,
        boardRunnerId: auth.userId,
        messages: (messages || []).map((m: any) => ({
          id: m.id,
          chat_id: m.chat_id,
          sender_id: m.sender_id,
          content: m.content,
          created_at: m.created_at,
          is_outgoing: m.sender_id === auth.userId
        }))
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Error fetching chat' }, { status: 500 });
    }
  }

  // 3. Unread Summary for all magnets
  if (action === 'get_unread_summary') {
    if (!config.enabled || !supabase) {
      return NextResponse.json({ unreadBySender: {} });
    }

    const auth = await authenticateBoardRunner(config);
    if (!auth) {
      return NextResponse.json({ unreadBySender: {} });
    }

    try {
      // Get all chats where Board Runner is a participant
      const { data: chats } = await supabase
        .from('board_chats')
        .select('id, user_a_id, user_b_id')
        .or(`user_a_id.eq.${auth.userId},user_b_id.eq.${auth.userId}`);

      if (!chats || chats.length === 0) {
        return NextResponse.json({ unreadBySender: {} });
      }

      const chatIds = chats.map(c => c.id);

      // Get read receipts for the Board Runner
      const { data: receipts } = await supabase
        .from('chat_read_receipts')
        .select('chat_id, last_read_at')
        .eq('user_id', auth.userId)
        .in('chat_id', chatIds);

      const readMap = new Map<string, string>();
      (receipts || []).forEach(r => readMap.set(r.chat_id, r.last_read_at));

      // Fetch recent messages across these chats sent by OTHER users
      const { data: incomingMsgs } = await supabase
        .from('board_messages')
        .select('id, chat_id, sender_id, content, created_at')
        .in('chat_id', chatIds)
        .neq('sender_id', auth.userId)
        .order('created_at', { ascending: false })
        .limit(100);

      const unreadBySender: Record<string, { count: number; lastMessage: string; lastTimestamp: string; chatId: string }> = {};

      for (const msg of incomingMsgs || []) {
        const lastRead = readMap.get(msg.chat_id);
        const isUnread = !lastRead || new Date(msg.created_at) > new Date(lastRead);

        if (isUnread) {
          if (!unreadBySender[msg.sender_id]) {
            unreadBySender[msg.sender_id] = {
              count: 1,
              lastMessage: msg.content,
              lastTimestamp: msg.created_at,
              chatId: msg.chat_id
            };
          } else {
            unreadBySender[msg.sender_id].count++;
          }
        }
      }

      // Query profiles of unread message senders to map phone numbers
      const senderIds = Object.keys(unreadBySender);
      const unreadByPhone: Record<string, { count: number; lastMessage: string; lastTimestamp: string; chatId: string; senderId: string }> = {};

      if (senderIds.length > 0) {
        try {
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, cellular_number')
            .in('id', senderIds);

          (senderProfiles || []).forEach((sp: any) => {
            const raw = sp.cellular_number || '';
            const clean = raw.replace(/\D/g, '').slice(-10);
            if (clean && unreadBySender[sp.id]) {
              unreadByPhone[clean] = {
                ...unreadBySender[sp.id],
                senderId: sp.id
              };
            }
          });
        } catch (profileErr) {
          console.warn('Error fetching sender profiles for unread summary:', profileErr);
        }
      }

      return NextResponse.json({ unreadBySender, unreadByPhone });
    } catch (err) {
      console.warn('Error fetching unread summary:', err);
      return NextResponse.json({ unreadBySender: {}, unreadByPhone: {} });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const board = await loadBoardState();
    const config = board.messagingConfig || {
      enabled: false,
      boardRunnerEmail: 'boardrunner@boardrunner.com',
      boardRunnerPassword: 'boardrunner@boardrunner.com',
      boardRunnerName: 'OR Board Runner',
      pushEndpoint: 'https://pinecone-backend-7m1p.onrender.com/api/send-chat-push'
    };
    const supabase = getPublicSupabaseServerClient(config.supabaseUrl, config.supabaseAnonKey);

    // 1. UPDATE CONFIG (Superuser Admin)
    if (action === 'UPDATE_CONFIG') {
      const { newConfig, currentUser } = body;
      if (currentUser?.role !== 'superuser') {
        return NextResponse.json({ error: 'Superuser permission required' }, { status: 403 });
      }

      board.messagingConfig = {
        enabled: Boolean(newConfig.enabled),
        boardRunnerEmail: (newConfig.boardRunnerEmail || 'boardrunner@boardrunner.com').trim(),
        boardRunnerPassword: (newConfig.boardRunnerPassword || 'boardrunner@boardrunner.com').trim(),
        boardRunnerName: (newConfig.boardRunnerName || 'OR Board Runner').trim(),
        pushEndpoint: (newConfig.pushEndpoint || 'https://pinecone-backend-7m1p.onrender.com/api/send-chat-push').trim(),
        cachedBoardRunnerId: newConfig.cachedBoardRunnerId || board.messagingConfig?.cachedBoardRunnerId,
        supabaseUrl: newConfig.supabaseUrl?.trim() || undefined,
        supabaseAnonKey: newConfig.supabaseAnonKey?.trim() || undefined
      };

      cachedBoardRunnerAuth = null; // Invalidate cache
      await saveBoardState(board);
      return NextResponse.json({ success: true, messagingConfig: board.messagingConfig });
    }

    // 2. TEST CONNECTION
    if (action === 'TEST_CONNECTION') {
      const testConfig: MessagingConfig = {
        enabled: true,
        boardRunnerEmail: (body.email || config.boardRunnerEmail).trim(),
        boardRunnerPassword: (body.password || config.boardRunnerPassword).trim(),
        boardRunnerName: (body.name || config.boardRunnerName || 'OR Board Runner').trim(),
        pushEndpoint: (body.pushEndpoint || config.pushEndpoint).trim(),
        supabaseUrl: body.supabaseUrl?.trim() || config.supabaseUrl,
        supabaseAnonKey: body.supabaseAnonKey?.trim() || config.supabaseAnonKey
      };

      const supabase = getPublicSupabaseServerClient(testConfig.supabaseUrl, testConfig.supabaseAnonKey);
      if (!supabase) {
        return NextResponse.json({
          success: false,
          error: 'Supabase URL or Key is not configured.'
        }, { status: 400 });
      }

      cachedBoardRunnerAuth = null;
      const auth = await authenticateBoardRunner(testConfig);
      if (!auth) {
        return NextResponse.json({
          success: false,
          error: 'Failed to authenticate with Perfect Call. Check email and password.'
        }, { status: 401 });
      }

      // Update cached board runner ID in board state
      board.messagingConfig = {
        ...config,
        cachedBoardRunnerId: auth.userId
      };
      await saveBoardState(board);

      return NextResponse.json({
        success: true,
        userId: auth.userId,
        name: auth.name,
        email: testConfig.boardRunnerEmail
      });
    }

    // 3. SEND MESSAGE
    if (action === 'SEND_MESSAGE') {
      const { recipientId, content } = body;
      if (!recipientId || !content?.trim()) {
        return NextResponse.json({ error: 'recipientId and content are required' }, { status: 400 });
      }

      if (!config.enabled) {
        return NextResponse.json({ error: 'Messaging is currently disabled in Superuser settings' }, { status: 400 });
      }

      const supabase = getPublicSupabaseServerClient(config.supabaseUrl, config.supabaseAnonKey);
      if (!supabase) {
        return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
      }

      const auth = await authenticateBoardRunner(config);
      if (!auth) {
        return NextResponse.json({ error: 'Could not authenticate Board Runner account' }, { status: 401 });
      }

      // Step A: RPC get_or_create_user_chat
      const { data: chatId, error: rpcErr } = await supabase.rpc('get_or_create_user_chat', {
        p_user_1_id: auth.userId,
        p_user_2_id: recipientId
      });

      if (rpcErr || !chatId) {
        console.error('RPC Error on get_or_create_user_chat:', rpcErr);
        return NextResponse.json({ error: 'Failed to access chat thread' }, { status: 500 });
      }

      // Step B: Insert into board_messages
      const { data: newMsg, error: insertErr } = await supabase
        .from('board_messages')
        .insert({
          chat_id: chatId,
          sender_id: auth.userId,
          content: content.trim()
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Insert error on board_messages:', insertErr);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }

      // Step C: Trigger Push Notification to recipient phone
      const pushUrl = config.pushEndpoint || 'https://pinecone-backend-7m1p.onrender.com/api/send-chat-push';
      try {
        fetch(pushUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: recipientId,
            senderId: auth.userId,
            senderName: auth.name || 'OR Board Runner',
            chatId: chatId
          })
        }).catch(e => console.warn('Non-blocking push error:', e));
      } catch (pushErr) {
        console.warn('Push dispatch error:', pushErr);
      }

      return NextResponse.json({
        success: true,
        message: {
          id: newMsg.id,
          chat_id: newMsg.chat_id,
          sender_id: newMsg.sender_id,
          content: newMsg.content,
          created_at: newMsg.created_at,
          is_outgoing: true
        }
      });
    }

    // 4. MARK READ
    if (action === 'MARK_READ') {
      const { chatId } = body;
      if (!chatId || !supabase) {
        return NextResponse.json({ success: true });
      }

      const auth = await authenticateBoardRunner(config);
      if (auth) {
        await supabase.from('chat_read_receipts').upsert({
          chat_id: chatId,
          user_id: auth.userId,
          last_read_at: new Date().toISOString()
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in messages API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
