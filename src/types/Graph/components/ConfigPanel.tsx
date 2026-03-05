import React from 'react';
import { GraphConfig } from '../type';
import { useConfigPanelStyles } from './ConfigPanel.styles';

const evaluationOptions = [
	'isomorphism',
	'connectivity',
	'bipartite',
	'cycle_detection',
	'graph_coloring',
	'planarity',
	'tree',
	'forest',
	'dag',
	'eulerian',
	'semi_eulerian',
	'regular',
	'complete',
	'degree_sequence',
	'subgraph',
	'hamiltonian_path',
	'hamiltonian_cycle',
	'clique_number'
];

interface ConfigPanelProps {
	config: GraphConfig;
	onChange: (config: GraphConfig) => void;
	AnswerPanel?: React.ReactNode;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, AnswerPanel }) => {
	const { classes, cx } = useConfigPanelStyles()
	const [selectedType, setSelectedType] = React.useState<string>(config.evaluation_type ?? '')
	const [directed, setDirected] = React.useState<boolean>(config.directed ?? false)

	const updateConfig = (updates: Partial<GraphConfig>) => {
		onChange({ ...config, ...updates });
	};

	const handleTypeChange = (type: string) => {
		setSelectedType(type);
		updateConfig({ evaluation_type: type });
	};

	const handleDirectedToggle = (val: boolean) => {
		setDirected(val);
		updateConfig({ directed: val });
	};

	return (
		<div className={classes.container}>

			{/* ---- Directed / Undirected toggle ---- */}
			<div>
				<h3 className={classes.sectionHeading}>Graph Type</h3>
				<div className={classes.radioGroupRow}>
					{([false, true] as const).map(val => (
						<label key={String(val)} className={cx(classes.radioLabel, directed === val && classes.radioLabelActive)}>
							<input
								type="radio"
								name="graph-directed"
								value={String(val)}
								checked={directed === val}
								onChange={() => handleDirectedToggle(val)}
								className={classes.radioInput}
							/>
							{val ? 'Directed' : 'Undirected'}
						</label>
					))}
				</div>
			</div>

			{/* ---- Evaluation type selector ---- */}
			<div>
				<h3 className={classes.sectionHeading}>Evaluation Type</h3>
				<div className={classes.radioGroupColumn}>
					{evaluationOptions.map(type => (
						<label
							key={type}
							className={cx(classes.radioLabel, selectedType === type && classes.radioLabelActive)}
						>
							<input
								type="radio"
								name="graph-evaluation-type"
								value={type}
								checked={selectedType === type}
								onChange={() => handleTypeChange(type)}
								className={classes.radioInputWide}
							/>
							<span className={classes.radioOptionText}>{type.replace(/_/g, ' ')}</span>
						</label>
					))}
				</div>
			</div>

			{selectedType === 'isomorphism' && AnswerPanel}

		</div>
	);
};
