class PenaltyStatus {
  const PenaltyStatus({required this.value, required this.label});

  final String value;
  final String label;
}

const List<PenaltyStatus> knownPenaltyStatuses = <PenaltyStatus>[
  PenaltyStatus(value: 'active', label: 'Active'),
  PenaltyStatus(value: 'waived', label: 'Waived'),
  PenaltyStatus(value: 'paid', label: 'Paid'),
  PenaltyStatus(value: 'disputed', label: 'Disputed'),
];
typedef PenaltyRouteMetadata = Map<String, dynamic>;

