#[test_only]
module gbam::user_registry_test;

use gbam::user_registry::{Self, UsersBook};
use std::debug;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario;

// const E_NAME_TAKEN: u64 = 1;
// const E_NOT_OWNER: u64 = 2;
const E_NAME_FOUND: u64 = 3;
const E_ZERO_AMOUNT: u64 = 4;

#[test]
fun test_initliazation() {
    let deployer = @0x1;
    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        user_registry::test_init(scenario.ctx())
    };

    test_scenario::end(scenario);
}

#[test]
fun test_add_username() {
    let deployer = @0x1;
    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        user_registry::test_init(scenario.ctx())
    };

    scenario.next_tx(deployer);
    {
        let mut userbook = test_scenario::take_shared<UsersBook>(&scenario);

        user_registry::add_usernames(&mut userbook, b"DEPLOYER".to_string(), scenario.ctx());

        test_scenario::return_shared(userbook);
    };
    scenario.next_tx(deployer);
    {
        let userbook = test_scenario::take_shared<UsersBook>(&scenario);

        let username = user_registry::get_username_by_address(&userbook, scenario.ctx());

        // debug::print(&username);
        assert!(username == b"DEPLOYER".to_string(), E_NAME_FOUND);

        test_scenario::return_shared(userbook);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_username_taken() {
    let deployer = @0x1;
    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        user_registry::test_init(scenario.ctx())
    };

    scenario.next_tx(deployer);
    {
        let mut userbook = test_scenario::take_shared<UsersBook>(&scenario);

        user_registry::add_usernames(&mut userbook, b"DEPLOYER".to_string(), scenario.ctx());

        test_scenario::return_shared(userbook);
    };
    scenario.next_tx(deployer);
    {
        let userbook = test_scenario::take_shared<UsersBook>(&scenario);

        let addr = user_registry::get_address_by_username(&userbook, b"DEPLOYER".to_string());

        // debug::print(addr);
        assert!(addr != @0x2, E_NAME_FOUND);

        test_scenario::return_shared(userbook);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_update_username() {
    let deployer = @0x1;
    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        user_registry::test_init(scenario.ctx())
    };

    scenario.next_tx(deployer);
    {
        let mut userbook = test_scenario::take_shared<UsersBook>(&scenario);

        user_registry::add_usernames(&mut userbook, b"DEPLOYER".to_string(), scenario.ctx());

        test_scenario::return_shared(userbook);
    };
    scenario.next_tx(deployer);
    {
        let mut userbook = test_scenario::take_shared<UsersBook>(&scenario);

        user_registry::update_username(&mut userbook, b"NEW_DEPLOYER".to_string(), scenario.ctx());

        test_scenario::return_shared(userbook);
    };
    scenario.next_tx(deployer);
    {
        let userbook = test_scenario::take_shared<UsersBook>(&scenario);

        let username = user_registry::get_username_by_address(&userbook, scenario.ctx());

        assert!(username == b"NEW_DEPLOYER".to_string(), E_NAME_FOUND);

        test_scenario::return_shared(userbook);
    };

    test_scenario::end(scenario);
}

#[test]
fun test_send_sui_via_username() {
    let deployer = @0x1;
    let recipient = @0x2;
    let amount = 100_000_000_000; // 100 SUI

    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        user_registry::test_init(scenario.ctx())
    };

    scenario.next_tx(deployer);
    {
        let mut userbook = test_scenario::take_shared<UsersBook>(&scenario);

        user_registry::add_usernames(&mut userbook, b"DEPLOYER".to_string(), scenario.ctx());

        test_scenario::return_shared(userbook);
    };
    scenario.next_tx(recipient);
    {
        let mut userbook = test_scenario::take_shared<UsersBook>(&scenario);

        user_registry::add_usernames(&mut userbook, b"RECEIVER".to_string(), scenario.ctx());

        test_scenario::return_shared(userbook);
    };
    scenario.next_tx(deployer);
    {
        let userbook = test_scenario::take_shared<UsersBook>(&scenario);

        let sui_coin = coin::mint_for_testing<SUI>(amount * 2, scenario.ctx());

        user_registry::send_sui_by_username(
            &userbook,
            b"RECEIVER".to_string(),
            sui_coin,
            amount,
            scenario.ctx(),
        );

        test_scenario::return_shared(userbook);
    };

    scenario.next_tx(deployer);
    {
        let sui_coin_balance = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
        let balance = coin::balance<SUI>(&sui_coin_balance);

        debug::print(balance);
        // debug::print(&balance.value());

        assert!(balance.value() == amount, E_ZERO_AMOUNT);

        test_scenario::return_to_sender(&scenario, sui_coin_balance);
    };
    scenario.next_tx(recipient);
    {
        let sui_coin_balance = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
        let balance = coin::balance<SUI>(&sui_coin_balance);

        debug::print(balance);
        // debug::print(&balance.value());

        assert!(balance.value() == amount, E_ZERO_AMOUNT);

        test_scenario::return_to_sender(&scenario, sui_coin_balance);
    };

    test_scenario::end(scenario);
}
