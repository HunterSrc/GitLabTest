export enum TypeCodeEnum {
    NR_PROJECT = 'NR_PROJECT',
    COMMISSION = 'COMMISSION',
    ENGINEERING = 'ENGINEERING',
    JOB_ORDER = 'JOB_ORDER',
    STANDARD_ACTIVITY = 'STANDARD_ACTIVITY',
    STANDARD_ACTIVITY_JOB_ORDER = 'STANDARD_ACTIVITY_JOB_ORDER',
    STANDARD_ACTIVITY_TENDER_CALL = 'STANDARD_ACTIVITY_TENDER_CALL',
    STANDARD_ACTIVITY_JOB_PROCUREMENT = 'STANDARD_ACTIVITY_JOB_PROCUREMENT',
    STANDARD_ACTIVITY_CONTRACT = 'STANDARD_ACTIVITY_CONTRACT',
    VR_PROJECT = 'VR_PROJECT',
    MATERIALS = 'MATERIALS',
    BATCHES = 'BATCHES',
    BATCH = 'BATCH',
    TENDER_CALLS = 'TENDER_CALLS',
    TENDER_CALL = 'TENDER_CALL',
    TENDER_CALLS_FOR = 'TENDER_CALLS_FOR',
    TENDER_CALL_FOR = 'TENDER_CALL_FOR',
    TENDER_CONTRACTS = 'TENDER_CONTRACTS',
    TENDER_CONTRACTS_FOR = 'TENDER_CONTRACTS_FOR',
    TENDER_CONTRACT = 'TENDER_CONTRACT',
    TENDER_CONTRACT_FOR = 'TENDER_CONTRACT_FOR',
    CONV_JOB_ORDERS = 'CONV_JOB_ORDERS',
    AUTHORIZATIONS = 'AUTHORIZATIONS',
    PUB_AUTHORIZATIONS = 'PUB_AUTHORIZATIONS',
    PUB_MAIN_AUTHS = 'PUB_MAIN_AUTHS',
    PUB_MAIN_AUTH = 'PUB_MAIN_AUTH',
    PUB_SEC_AUTHS = 'PUB_SEC_AUTHS',
    PUB_SEC_AUTH = 'PUB_SEC_AUTH',
    PUB_ES_AUTHS = 'PUB_ES_AUTHS',
    PUB_ES_AUTH = 'PUB_ES_AUTH',
    PRI_AUTHORIZATIONS = 'PRI_AUTHORIZATIONS',
    PRI_AUTH = 'PRI_AUTH',
    JOB_PROCUREMENT = 'JOB_PROCUREMENT',
    CONSTRUCTION = 'CONSTRUCTION',
    CONTRACT = 'CONTRACT',
    RESTORATIONS = 'RESTORATIONS',
    AUTH_COMMUNICATION = 'AUTH_COMMUNICATION',
    ENTRY_INTO_SERVICE = 'ENTRY_INTO_SERVICE'
}

export type TypeCodeUnion = keyof typeof TypeCodeEnum;