use aiken/dict
use aiken/list
use aiken/transaction.{Output, ScriptContext, Transaction} as tx
use aiken/transaction/credential.{VerificationKeyCredential} as credential
use aiken/transaction/value

type Action {
  Mint
  Burn
}

validator(price_in_ada: Int, creator: ByteArray) {
  fn mint(redeemer: Action, ctx: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = ctx
    expect tx.Mint(policy_id) = purpose
    let Transaction { mint, outputs, .. } = transaction
    expect [(_, user_amount), (_, reference_amount)] =
      mint
        |> value.from_minted_value
        |> value.tokens(policy_id)
        |> dict.to_list()

    expect Some(payment_output) =
      outputs
        |> list.find(
             fn(output) {
               when output.address.payment_credential is {
                 VerificationKeyCredential(payment_cred_key_hash) ->
                   payment_cred_key_hash == creator
                 _ -> False
               }
             },
           )
    let payment_value = payment_output.value

    when redeemer is {
      Mint ->
        user_amount == 1 && reference_amount == 1 && value.lovelace_of(
          payment_value,
        ) == price_in_ada
      Burn -> user_amount == -1 && reference_amount == -1
    }
  }
}
