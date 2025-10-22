#[test_only]
module gbam::gbam_token_test;

use gbam::gbam_token::{Self, SupplyBank};
use std::debug;
use sui::test_scenario;

#[test]
fun test_initliazation() {
    let deployer = @0x1;
    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        gbam_token::test_init(scenario.ctx())
    };

    test_scenario::end(scenario);
}

#[test]
fun test_reward_claim() {
    let deployer = @0x1;
    let player = @0x2;
    let mut scenario = test_scenario::begin(deployer);

    scenario.next_tx(deployer);
    {
        gbam_token::test_init(scenario.ctx())
    };
    scenario.next_tx(player);
    {
        let mut supply_bank = test_scenario::take_shared<SupplyBank>(&scenario);

        let amount = 1_000_000; //(1 GBAM)

        gbam_token::claim_reward(&mut supply_bank, amount, scenario.ctx());

        test_scenario::return_shared(supply_bank);
    };
    scenario.next_tx(deployer);
    {
        let supply_bank = test_scenario::take_shared<SupplyBank>(&scenario);

        debug::print(&supply_bank);

        test_scenario::return_shared(supply_bank);
    };
    test_scenario::end(scenario);
}
