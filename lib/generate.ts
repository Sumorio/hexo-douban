import idouban from "idouban";
import { DoubanConfig, TypeConfig } from "./types";
import createLogger from "hexo-log";
import Handlebars from "handlebars";
import { readFileSync } from "hexo-fs";

const template: string = `<div id="idouban"></div>
<style type="text/css">
  {{{style}}}
</style>
<script>
/*<!--*/
  {{{script}}}
/*-->*/
</script>
<script>
/*<!--*/
 idouban.init({{{init}}}) 
/*-->*/
</script>
`;

const escape_html = (unsafe: string) => {
  return unsafe;
};

const log = createLogger({
  debug: false,
  silent: false,
});

export async function generate(
  lang: string,
  url: string,
  type: string,
  config: DoubanConfig
) {
  if (!config.item_per_page) {
    config.item_per_page = 10;
  }

  if (!config.meta_max_line) {
    config.meta_max_line = 4;
  }

  if (!config.customize_layout) {
    config.customize_layout = "page";
  }

  const available_actions = ["do", "wish", "collect"];
  const type_config = config[type] as TypeConfig;

  if (type_config.actions && type_config.actions.length !== 0) {
    type_config.actions = type_config.actions.filter((action) =>
      available_actions.includes(action)
    );
    if (type_config.actions.length === 0) {
      type_config.actions = available_actions;
    }
  } else {
    type_config.actions = available_actions;
  }

  const script = readFileSync(
    "../node_modules/idouban/dist/index.js"
  ) as string;
  const style = readFileSync(
    "../node_modules/idouban/dist/index.css"
  ) as string;

  const init_config = {
    selector: "#idouban",
    lang: lang,
    douban_id: config.id,
    type: type,
    quote: type_config.quote,
    page_size: config.item_per_page,
    max_line: config.meta_max_line,
  };

  if (config.dynamic) {
    init_config["actions"] = type_config.actions;
  } else {
    const startTime = new Date().getTime();

    let data_list = await idouban.fetchData(
      config.id,
      url,
      type,
      type_config.actions
    );
    init_config["data_list"] = data_list;
    const endTime = new Date().getTime();

    log.info(
      `${data_list.map(
        (data) => data.action + "(" + data.items.length + ")"
      )} ${type} loaded in ${endTime - startTime} ms`
    );
  }

  const renderer = Handlebars.compile(template);
  const dom = renderer({
    style: style,
    script: escape_html(script),
    init: JSON.stringify(init_config),
  });

  return {
    path: type_config.path,
    data: Object.assign(
      {
        title: type_config.title,
        content: dom,
        slug: `${type}s`,
      },
      type_config.option
    ),
    layout: [config.customize_layout, "post"],
  };
}
