import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../widgets/empty_state.dart';

class GoalsTab extends StatelessWidget {
  const GoalsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmptyState(
      icon: Icons.flag_outlined,
      title: 'Metas',
      subtitle: 'Defina metas financeiras e acompanhe seu progresso.',
    );
  }
}
