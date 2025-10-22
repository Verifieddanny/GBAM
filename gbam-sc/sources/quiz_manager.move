module gbam::quiz_manager;

use gbam::gbam_token::{Self as token, SupplyBank, RewardMintCap};
use gbam::user_registry;
use sui::event;
use sui::table::{Self as table, Table};
use std::string;

const E_ALREADY_CLAIMED: u64 = 1;

public struct QUIZ_MANAGER has drop {}
public struct AdminCap has key, store { id: UID }

public struct QuizState has key {
    id: UID,
    day: u64, //timestamp or day count
    claimed_today: Table<address, u64>,
    cap: RewardMintCap,
    claimed_by_username: Table<address, u64>,
}

public struct DaySet has copy, drop { day: u64 }
public struct QuizClaimed has copy, drop { user: address, day: u64, correct: u8, amount: u64 }

// called once after gbam_token::init. stores the single cap
fun init(_witness: QUIZ_MANAGER, ctx: &mut TxContext) {
    let state = QuizState {
        id: object::new(ctx),
        day: 0,
        claimed_today: table::new(ctx),
        cap: token::create_mint_cap(ctx),
        claimed_by_username: table::new(ctx),
    };
    transfer::share_object(state);
    transfer::public_transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
}

// // admin rotates the day
public fun set_day(state: &mut QuizState, new_day: u64) {
    if (state.day != new_day) {
        state.day = new_day;
    };
    event::emit(DaySet { day: new_day });
}

// minimal submit and claim, you will add signature checks later
public fun submit_and_claim(
    state: &mut QuizState,
    bank: &mut SupplyBank,
    correct: u8,
    ctx: &mut TxContext,
) {
    let today = state.day;
    let user = tx_context::sender(ctx);

    if (table::contains<address, u64>(&state.claimed_today, user)) {
        let last_claimed_day = table::borrow(&state.claimed_today, user);
        assert!(*last_claimed_day != today, E_ALREADY_CLAIMED);
    };

    table::add(&mut state.claimed_today, user, today);

    let amount: u64 = if (correct == 1) 10 else 0;
    if (amount == 0) return;

    let amount_claimed =
        *table::borrow_mut<address, u64>(&mut state.claimed_by_username, tx_context::sender(ctx));

    table::remove(&mut state.claimed_by_username, tx_context::sender(ctx));

    let new_total = amount_claimed + amount;

    table::add(&mut state.claimed_by_username, tx_context::sender(ctx), new_total);
    // borrow the cap that lives inside state
    token::reward_from_manager(bank, &state.cap, user, amount, ctx);

    event::emit(QuizClaimed { user, day: today, correct, amount });
}


public fun get_user_rewards(state: &QuizState, user: address): u64 {
    if (table::contains<address, u64>(&state.claimed_by_username, user)) {
        *table::borrow<address, u64>(&state.claimed_by_username, user)
    } else {
        0
    }
}


public fun get_user_rewards_by_username(
    state: &QuizState,
    usersbook: &user_registry::UsersBook,
    username: string::String
): u64 {
    let user = user_registry::get_address_by_username(usersbook, username);
    get_user_rewards(state, user)
}


/// Admin Function
public fun set_day_admin(_cap: &AdminCap, state: &mut QuizState, new_day: u64) {
    state.day = new_day;
}
