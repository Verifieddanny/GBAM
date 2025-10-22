module gbam::gbam_token;

use std::string::String;
use sui::coin::{Self, TreasuryCap};
use sui::coin_registry::{Self as reg, CoinRegistry, Currency};
use sui::event;
use sui::url::{Self, Url};
use sui::transfer::Receiving;

public struct GBAM_TOKEN has drop {}

public struct RewardMintCap has store { _z: bool }

public(package) fun create_mint_cap(_ctx: &mut TxContext): RewardMintCap {
    RewardMintCap { _z: true }
}

/// Events
public struct CreatedCurrency has copy, drop {
    name_of_token: String,
    symbol: String,
    token_image: Option<Url>,
    current_total_supply: u64,
}

/// After Minting Token
public struct Rewarded has copy, drop {
    recipient: address,
    amount: u64,
    token_in_circulation: u64,
}

public struct SupplyBank has key {
    id: UID,
    tcap: TreasuryCap<GBAM_TOKEN>,
    max_total_supply: u64,
    total_minted: u64,
}

const DECIMALS: u8 = 6;
const HARD_CAP: u64 = 10_000_000_000_000000; // 10 billion GBAM_TOKEN with 6 decimals

const ERROR_EXCEED_MAX_SUPPLY: u64 = 0;

fun init(witness: GBAM_TOKEN, ctx: &mut TxContext) {
    let ( builder, tcap) = reg::new_currency_with_otw(
        witness,
        DECIMALS,
        b"GMB".to_string(),
        b"GbamPoints".to_string(),
        b"Boss wey to sabi this Naija thing".to_string(),
        b"https://pbs.twimg.com/profile_images/1741411753404084224/yLULBONw_400x400.jpg".to_string(),
        ctx,
    );

    let mcap = reg::finalize(builder, ctx);
    transfer::public_transfer(mcap, tx_context::sender(ctx));

    event::emit(CreatedCurrency {
        name_of_token: b"GbamPoints".to_string(),
        symbol: b"GMB".to_string(),
        token_image: option::some(url::new_unsafe_from_bytes(
            b"https://pbs.twimg.com/profile_images/1741411753404084224/yLULBONw_400x400.jpg"
        )),
        current_total_supply: 0,
    });

    let bank = SupplyBank {
        id: object::new(ctx),
        tcap: tcap,
        max_total_supply: HARD_CAP,
        total_minted: 0,
    };

    transfer::share_object(bank);
}

public fun finalize_registration(registry: &mut CoinRegistry, currency: Receiving<Currency<GBAM_TOKEN>>, _ctx: &mut TxContext){
    reg::finalize_registration<GBAM_TOKEN>(registry, currency, _ctx)
}

#[allow(lint(self_transfer))]
public fun claim_reward(bank: &mut SupplyBank, amount: u64, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);

    if (bank.max_total_supply > 0) {
        assert!(bank.total_minted + amount <= bank.max_total_supply, ERROR_EXCEED_MAX_SUPPLY);
    };


    coin::mint_and_transfer(&mut bank.tcap, amount, sender, ctx);
    bank.total_minted = bank.total_minted + amount;
    event::emit(Rewarded {
        recipient: sender,
        amount,
        token_in_circulation: bank.total_minted,
    });
}

// use the cap to mint rewards
public fun reward_from_manager(
    bank: &mut SupplyBank,
    _cap: &RewardMintCap,
    to: address,
    amount: u64,
    ctx: &mut TxContext
) {
    assert!(amount > 0, 100);
    if (bank.max_total_supply > 0) {
        assert!(bank.total_minted + amount <= bank.max_total_supply, ERROR_EXCEED_MAX_SUPPLY);
    };
    coin::mint_and_transfer(&mut bank.tcap, amount, to, ctx);
    bank.total_minted = bank.total_minted + amount;
    event::emit(Rewarded { recipient: to, amount, token_in_circulation: bank.total_minted });
}

#[test_only]
public fun test_init(ctx: &mut TxContext) {
    init(GBAM_TOKEN {}, ctx);
}

