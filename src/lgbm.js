export function predict(model, features, clip=[0,1]) {
  if(!String(model.objective).startsWith('regression')||model.average_output) throw new Error('Unsupported LightGBM objective');
  let result=0;
  for(const tree of model.tree_info) {
    let node=tree.tree_structure;
    while(!Object.hasOwn(node,'leaf_value')) {
      if(node.decision_type!=='<=') throw new Error(`Unsupported split: ${node.decision_type}`);
      let value=features[node.split_feature];
      if(value===undefined||value===null) value=NaN;
      // LightGBM treats NaN as zero when the split does not designate NaN missing.
      if(Number.isNaN(value)&&node.missing_type!=='NaN') value=0;
      const missing=(node.missing_type==='NaN'&&Number.isNaN(value))||(node.missing_type==='Zero'&&Math.abs(value)<=1e-35);
      node=(missing?node.default_left:value<=node.threshold)?node.left_child:node.right_child;
    }
    result+=node.leaf_value;
  }
  return Math.max(clip[0],Math.min(clip[1],result));
}
