module gbam::user_registry;

use std::string::{Self, String};
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};

const E_NAME_TAKEN: u64 = 1;
const E_NAME_NOT_FOUND: u64 = 3;

public struct UsernameRecord has copy, drop, store {
    username: String,
}

public struct UsersBook has key {
    id: UID,
    address_to_username: Table<address, UsernameRecord>,
    username_to_address: Table<String, address>,
}

///events
public struct UsernameClaimed has copy, drop { owner: address, username: String }
public struct UsernameUpdated has copy, drop { owner: address, old: String, new: String }
public struct SentByUsername has copy, drop {
    from: address,
    to: address,
    username: String,
    amount: u64,
}

fun init(ctx: &mut TxContext) {
    let address_to_username = table::new(ctx);
    let username_to_address = table::new(ctx);
    let users_book = UsersBook {
        id: object::new(ctx),
        address_to_username,
        username_to_address,
    };
    transfer::share_object(users_book);
}

public fun add_usernames(userbook: &mut UsersBook, username: String, ctx: &mut TxContext) {
    let owner = tx_context::sender(ctx);

    assert!(
        !table::contains<String, address>(&userbook.username_to_address, username),
        E_NAME_TAKEN,
    );

    assert!(
        !table::contains<address, UsernameRecord>(&userbook.address_to_username, owner),
        E_NAME_TAKEN,
    );
    let record = UsernameRecord { username: username };
    table::add(&mut userbook.address_to_username, owner, record);

    table::add(&mut userbook.username_to_address, username, owner);

    event::emit(UsernameClaimed { owner, username: username });
}

public fun update_username(userbook: &mut UsersBook, new_username: String, ctx: &mut TxContext) {
    let uname = new_username;

    let owner = tx_context::sender(ctx);
    assert!(!table::contains<String, address>(&userbook.username_to_address, uname), E_NAME_TAKEN);

    let rec = table::borrow_mut<address, UsernameRecord>(&mut userbook.address_to_username, owner);

    let old_username = rec.username;

    table::remove(&mut userbook.username_to_address, old_username);

    rec.username = new_username;

    table::add(&mut userbook.username_to_address, new_username, owner);

    event::emit(UsernameUpdated {
        owner,
        old: old_username,
        new: new_username,
    });
}

public fun get_address_by_username(usersbook: &UsersBook, username: String): address {
    assert!(
        table::contains<String, address>(&usersbook.username_to_address, username),
        E_NAME_NOT_FOUND,
    );
    *table::borrow(&usersbook.username_to_address, username)
}

public fun get_username_by_address(usersbook: &UsersBook, ctx: &mut TxContext): string::String {
    let sender = tx_context::sender(ctx);
    let userRecord = table::borrow(&usersbook.address_to_username, sender);
    userRecord.username
}

// Convenience, send SUI by username
#[allow(lint(self_transfer))]
public fun send_sui_by_username(
    register: &UsersBook,
    username: string::String,
    mut payment: Coin<SUI>,
    amount: u64,
    ctx: &mut TxContext,
) {
    let to_addr = get_address_by_username(register, username);
    let part = coin::split(&mut payment, amount, ctx);
    transfer::public_transfer(part, to_addr);

    // return change automatically
    transfer::public_transfer(payment, tx_context::sender(ctx));

    event::emit(SentByUsername {
        from: tx_context::sender(ctx),
        to: to_addr,
        username,
        amount,
    })
}

#[test_only]
public fun test_init(ctx: &mut TxContext) {
    init(ctx);
}
